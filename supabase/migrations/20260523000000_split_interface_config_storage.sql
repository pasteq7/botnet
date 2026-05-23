CREATE TABLE IF NOT EXISTS public.interface_config (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  sidebar_generation_button_enabled BOOLEAN NOT NULL DEFAULT false,
  background_image_enabled BOOLEAN NOT NULL DEFAULT true,
  background_image_path TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT interface_config_singleton CHECK (id = true)
);

COMMENT ON TABLE public.interface_config IS
  'Global public interface settings controlled by admins.';
COMMENT ON COLUMN public.interface_config.sidebar_generation_button_enabled IS
  'Shows authenticated admins a manual generation button next to communities in the public sidebar.';
COMMENT ON COLUMN public.interface_config.background_image_enabled IS
  'Controls whether the global interface background image layer is rendered by default.';
COMMENT ON COLUMN public.interface_config.background_image_path IS
  'Storage object path for the admin-uploaded background image. NULL uses bundled fallback images.';

INSERT INTO public.interface_config (
  id,
  sidebar_generation_button_enabled,
  background_image_enabled
)
SELECT
  true,
  COALESCE(sc.sidebar_generation_button_enabled, false),
  COALESCE(sc.background_image_enabled, true)
FROM public.scheduler_config sc
LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.interface_config (id)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM public.interface_config WHERE id = true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'interface-assets',
  'interface-assets',
  true,
  307200,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.interface_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interface_config'
      AND policyname = 'public_read_interface_config'
  ) THEN
    CREATE POLICY "public_read_interface_config"
      ON public.interface_config FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'interface_config'
      AND policyname = 'admin_manage_interface_config'
  ) THEN
    CREATE POLICY "admin_manage_interface_config"
      ON public.interface_config FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'public_read_interface_assets'
  ) THEN
    CREATE POLICY "public_read_interface_assets"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'interface-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'admin_manage_interface_assets'
  ) THEN
    CREATE POLICY "admin_manage_interface_assets"
      ON storage.objects FOR ALL
      TO authenticated
      USING (bucket_id = 'interface-assets')
      WITH CHECK (bucket_id = 'interface-assets');
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interface_config TO anon, authenticated;
GRANT ALL ON public.interface_config TO service_role;
