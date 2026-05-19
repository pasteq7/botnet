-- =============================================================================
-- 04_rls_grants.sql
-- Row-level security policies and role grants.
-- =============================================================================

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persona_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_communities"
  ON public.communities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admin_manage_communities"
  ON public.communities FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_read_personas"
  ON public.personas FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admin_manage_personas"
  ON public.personas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_read_persona_communities"
  ON public.persona_communities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admin_manage_persona_communities"
  ON public.persona_communities FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_read_published_threads"
  ON public.threads FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "admin_manage_threads"
  ON public.threads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_read_comments"
  ON public.comments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admin_manage_comments"
  ON public.comments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_read_generation_logs"
  ON public.generation_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "no_client_writes_generation_logs"
  ON public.generation_logs FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "admin_manage_ai_configs"
  ON public.ai_configs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_manage_search_configs"
  ON public.search_configs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_read_scheduler_config"
  ON public.scheduler_config FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admin_manage_scheduler_config"
  ON public.scheduler_config FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
