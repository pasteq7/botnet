-- supabase/migrations/006_generation_logs_rls.sql
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for generation_logs"
ON generation_logs FOR SELECT
USING (true);