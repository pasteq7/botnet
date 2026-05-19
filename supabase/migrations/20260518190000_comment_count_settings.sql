ALTER TABLE public.scheduler_config
  ADD COLUMN default_min_comments_per_thread INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN default_max_comments_per_thread INTEGER NOT NULL DEFAULT 8;

ALTER TABLE public.communities
  ADD COLUMN min_comments_per_thread INTEGER DEFAULT NULL,
  ADD COLUMN max_comments_per_thread INTEGER DEFAULT NULL;

ALTER TABLE public.scheduler_config
  ADD CONSTRAINT scheduler_comment_defaults_non_negative
  CHECK (
    default_min_comments_per_thread >= 0
    AND default_max_comments_per_thread >= 0
    AND default_min_comments_per_thread <= default_max_comments_per_thread
  );

ALTER TABLE public.communities
  ADD CONSTRAINT communities_comment_overrides_non_negative
  CHECK (
    (min_comments_per_thread IS NULL OR min_comments_per_thread >= 0)
    AND (max_comments_per_thread IS NULL OR max_comments_per_thread >= 0)
    AND (
      min_comments_per_thread IS NULL
      OR max_comments_per_thread IS NULL
      OR min_comments_per_thread <= max_comments_per_thread
    )
  );

COMMENT ON COLUMN public.scheduler_config.default_min_comments_per_thread IS 'Global fallback minimum generated comments per thread.';
COMMENT ON COLUMN public.scheduler_config.default_max_comments_per_thread IS 'Global fallback maximum generated comments per thread.';
COMMENT ON COLUMN public.communities.min_comments_per_thread IS 'Optional per-community override for minimum generated comments per thread. NULL uses scheduler default.';
COMMENT ON COLUMN public.communities.max_comments_per_thread IS 'Optional per-community override for maximum generated comments per thread. NULL uses scheduler default.';
