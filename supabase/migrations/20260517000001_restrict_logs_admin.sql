-- Restrict generation_logs from public reads to admin-only
-- Logs can expose operational errors, model details, traces, and raw provider responses.

DROP POLICY IF EXISTS "public_read_generation_logs" ON generation_logs;

CREATE POLICY "admin_read_generation_logs"
  ON generation_logs FOR SELECT
  TO authenticated
  USING (true);
