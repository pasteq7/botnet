-- Commit a generated conversation and its success telemetry in one transaction.
-- The log ID is also the thread ID, so a retried Inngest step cannot publish twice.
CREATE OR REPLACE FUNCTION public.commit_generation(
  p_log_id uuid,
  p_community_id uuid,
  p_persona_id uuid,
  p_thread jsonb,
  p_comments jsonb,
  p_log jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_thread_id uuid;
  v_log_status text;
  v_comment jsonb;
  v_comment_id uuid;
  v_root_ids uuid[] := ARRAY[]::uuid[];
  v_index integer := 0;
  v_parent_index integer;
  v_parent_id uuid;
  v_depth integer;
  v_completed_at timestamptz := now();
BEGIN
  IF p_log_id IS NULL OR p_community_id IS NULL OR p_persona_id IS NULL THEN
    RAISE EXCEPTION 'Generation IDs are required';
  END IF;
  IF jsonb_typeof(p_thread) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_comments) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_log) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Generation payload has an invalid shape';
  END IF;

  -- Serialize retries for this log and require its queued/running row to exist.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_log_id::text, 0));
  SELECT thread_id, status INTO v_thread_id, v_log_status
  FROM public.generation_logs
  WHERE id = p_log_id AND community_id = p_community_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Generation log % was not found for community %', p_log_id, p_community_id;
  END IF;
  IF v_log_status = 'success' AND v_thread_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.threads WHERE id = v_thread_id) THEN
    RETURN v_thread_id;
  END IF;

  IF v_thread_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.threads WHERE id = v_thread_id) THEN
    v_thread_id := p_log_id;
    INSERT INTO public.threads (
      id, community_id, persona_id, title, body, flair, source_url,
      source_headline, content_mode, is_safety_filtered,
      is_published, is_ready, published_at
    ) VALUES (
      v_thread_id, p_community_id, p_persona_id,
      p_thread->>'title', p_thread->>'body', p_thread->>'flair',
      p_thread->>'source_url', p_thread->>'source_headline',
      p_thread->>'content_mode',
      COALESCE((p_thread->>'is_safety_filtered')::boolean, false),
      false, false, v_completed_at
    );

    -- The chain is ordered; each parent index points to an earlier comment.
    FOR v_comment IN SELECT value FROM jsonb_array_elements(p_comments) AS entries(value) LOOP
      v_parent_index := (v_comment->>'parent_index')::integer;
      IF v_parent_index IS NOT NULL AND (v_parent_index < 0 OR v_parent_index >= v_index) THEN
        RAISE EXCEPTION 'Invalid parent index % for comment %', v_parent_index, v_index;
      END IF;
      -- The current thread page renders one reply level, so attach nested
      -- responses to their root ancestor while preserving all comments.
      v_parent_id := CASE WHEN v_parent_index IS NULL THEN NULL ELSE v_root_ids[v_parent_index + 1] END;
      v_depth := CASE WHEN v_parent_id IS NULL THEN 0 ELSE 1 END;

      INSERT INTO public.comments (thread_id, parent_comment_id, persona_id, body, depth)
      VALUES (
        v_thread_id,
        v_parent_id,
        (v_comment->>'persona_id')::uuid,
        v_comment->>'body',
        v_depth
      )
      RETURNING id INTO v_comment_id;

      v_root_ids := array_append(v_root_ids, COALESCE(v_parent_id, v_comment_id));
      v_index := v_index + 1;
    END LOOP;
  END IF;

  -- Publishing, scheduler state, and the success log commit with the content.
  UPDATE public.threads
  SET is_ready = true, is_published = true
  WHERE id = v_thread_id;

  UPDATE public.communities
  SET last_generated_at = v_completed_at,
      last_generation_attempted_at = v_completed_at
  WHERE id = p_community_id;

  UPDATE public.generation_logs
  SET status = 'success', current_step = 'done', error_message = NULL,
      thread_id = v_thread_id,
      model_used = p_log->>'model_used',
      searcher_model = p_log->>'searcher_model',
      generator_model = p_log->>'generator_model',
      search_strategy = p_log->>'search_strategy',
      tokens_used = COALESCE((p_log->>'tokens_used')::integer, 0),
      trace = COALESCE(p_log->'trace', '[]'::jsonb),
      inngest_event_id = p_log->>'inngest_event_id',
      inngest_run_id = p_log->>'inngest_run_id'
  WHERE id = p_log_id;

  RETURN v_thread_id;
END;
$$;

REVOKE ALL ON FUNCTION public.commit_generation(uuid, uuid, uuid, jsonb, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_generation(uuid, uuid, uuid, jsonb, jsonb, jsonb)
  TO service_role;

-- Public reads must wait for complete conversations even if an older worker
-- left a published but unfinished thread behind.
DROP POLICY IF EXISTS "public_read_published_threads" ON public.threads;
CREATE POLICY "public_read_published_threads"
  ON public.threads FOR SELECT TO anon, authenticated
  USING (is_published = true AND is_ready = true);

DROP POLICY IF EXISTS "public_read_comments" ON public.comments;
CREATE POLICY "public_read_comments"
  ON public.comments FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.threads
      WHERE threads.id = comments.thread_id
        AND threads.is_published = true
        AND threads.is_ready = true
    )
  );
