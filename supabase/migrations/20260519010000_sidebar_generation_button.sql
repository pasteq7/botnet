ALTER TABLE public.scheduler_config
  ADD COLUMN sidebar_generation_button_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.scheduler_config.sidebar_generation_button_enabled IS
  'Shows authenticated admins a manual generation button next to communities in the public sidebar.';
