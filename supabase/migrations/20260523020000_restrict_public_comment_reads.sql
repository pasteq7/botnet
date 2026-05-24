-- Restrict anonymous comment reads to comments on published threads.

DROP POLICY IF EXISTS "public_read_comments" ON public.comments;

CREATE POLICY "public_read_comments"
  ON public.comments FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.threads
      WHERE threads.id = comments.thread_id
        AND threads.is_published = true
    )
  );
