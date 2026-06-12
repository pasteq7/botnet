COMMENT ON COLUMN public.communities.content_modes IS
  'List of enabled content generation modes (news, tips, discussion, ask, create, web-search).';

COMMENT ON COLUMN public.communities.content_mode_weights IS
  'Relative weights for each content mode, including create for original community-specific work.';

COMMENT ON COLUMN public.threads.content_mode IS
  'The mode used to generate this thread, including create for original community-specific work.';
