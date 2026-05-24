-- Require an explicit admin JWT claim for privileged client-side access.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' -> 'roles') ? 'admin'
    OR (auth.jwt() -> 'app_metadata' -> 'claims') ? 'admin',
    false
  );
$$;

DROP POLICY IF EXISTS "admin_manage_communities" ON public.communities;
CREATE POLICY "admin_manage_communities"
  ON public.communities FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_personas" ON public.personas;
CREATE POLICY "admin_manage_personas"
  ON public.personas FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_persona_communities" ON public.persona_communities;
CREATE POLICY "admin_manage_persona_communities"
  ON public.persona_communities FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_threads" ON public.threads;
CREATE POLICY "admin_manage_threads"
  ON public.threads FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_comments" ON public.comments;
CREATE POLICY "admin_manage_comments"
  ON public.comments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_read_generation_logs" ON public.generation_logs;
CREATE POLICY "admin_read_generation_logs"
  ON public.generation_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_ai_configs" ON public.ai_configs;
CREATE POLICY "admin_manage_ai_configs"
  ON public.ai_configs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_search_configs" ON public.search_configs;
CREATE POLICY "admin_manage_search_configs"
  ON public.search_configs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_scheduler_config" ON public.scheduler_config;
CREATE POLICY "admin_manage_scheduler_config"
  ON public.scheduler_config FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_interface_config" ON public.interface_config;
CREATE POLICY "admin_manage_interface_config"
  ON public.interface_config FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_interface_assets" ON storage.objects;
CREATE POLICY "admin_manage_interface_assets"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'interface-assets' AND public.is_admin())
  WITH CHECK (bucket_id = 'interface-assets' AND public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
