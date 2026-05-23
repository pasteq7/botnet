ALTER TABLE public.scheduler_config
  ADD COLUMN IF NOT EXISTS background_image_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS background_image_data_url TEXT DEFAULT NULL,
  ADD CONSTRAINT scheduler_config_background_image_size
    CHECK (
      background_image_data_url IS NULL
      OR octet_length(background_image_data_url) <= 410000
    );

COMMENT ON COLUMN public.scheduler_config.background_image_enabled IS
  'Controls whether the global interface background image layer is rendered.';

COMMENT ON COLUMN public.scheduler_config.background_image_data_url IS
  'Small admin-uploaded background image stored as a data URL. NULL uses the bundled /bg.png fallback.';
