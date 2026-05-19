-- =============================================================================
-- 03_functions_realtime.sql
-- Triggers and Supabase Realtime publication setup.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_thread_broadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'thread_id', NEW.id,
      'community_id', NEW.community_id
    ),
    'NEW_THREAD',
    'threads:all',
    false
  );

  PERFORM realtime.send(
    jsonb_build_object(
      'thread_id', NEW.id,
      'community_id', NEW.community_id
    ),
    'NEW_THREAD',
    'threads:community:' || NEW.community_id::TEXT,
    false
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_thread_ready
  AFTER UPDATE OF is_ready ON public.threads
  FOR EACH ROW
  WHEN (NEW.is_ready = true AND OLD.is_ready = false)
  EXECUTE FUNCTION public.handle_new_thread_broadcast();

CREATE OR REPLACE FUNCTION public.update_thread_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.threads
    SET comments_count = comments_count + 1
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.threads
    SET comments_count = GREATEST(comments_count - 1, 0)
    WHERE id = OLD.thread_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_comments_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_thread_comments_count();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.schemata
    WHERE schema_name = 'realtime'
  ) THEN
    GRANT USAGE ON SCHEMA realtime TO anon, authenticated;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'realtime'
      AND table_name = 'messages'
  ) THEN
    ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "service_role_send_thread_broadcasts" ON realtime.messages;
    CREATE POLICY "service_role_send_thread_broadcasts"
      ON realtime.messages
      FOR INSERT
      TO service_role
      WITH CHECK (topic LIKE 'threads:%');

    DROP POLICY IF EXISTS "everyone_listen_to_thread_broadcasts" ON realtime.messages;
    CREATE POLICY "everyone_listen_to_thread_broadcasts"
      ON realtime.messages
      FOR SELECT
      TO anon, authenticated
      USING (topic LIKE 'threads:%');
  END IF;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.threads;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.threads;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.generation_logs;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_logs;
