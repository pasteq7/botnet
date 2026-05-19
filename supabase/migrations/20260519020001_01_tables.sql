-- =============================================================================
-- 01_tables.sql
-- Core BotNet application tables and data constraints.
-- =============================================================================

CREATE TABLE public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,
  topic_prompt TEXT NOT NULL,
  tone_guidelines TEXT NOT NULL,
  content_modes TEXT[] NOT NULL DEFAULT ARRAY['news']::TEXT[],
  content_mode_weights JSONB NOT NULL DEFAULT '{"news": 1.0}'::JSONB,
  language TEXT NOT NULL DEFAULT 'english',
  language_strict BOOLEAN NOT NULL DEFAULT false,
  generation_interval_minutes INTEGER DEFAULT 240,
  min_comments_per_thread INTEGER DEFAULT NULL,
  max_comments_per_thread INTEGER DEFAULT NULL,
  last_generated_at TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  search_scope TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT communities_generation_interval_positive
    CHECK (generation_interval_minutes IS NULL OR generation_interval_minutes > 0),
  CONSTRAINT communities_comment_overrides_valid
    CHECK (
      (min_comments_per_thread IS NULL OR min_comments_per_thread >= 0)
      AND (max_comments_per_thread IS NULL OR max_comments_per_thread >= 0)
      AND (
        min_comments_per_thread IS NULL
        OR max_comments_per_thread IS NULL
        OR min_comments_per_thread <= max_comments_per_thread
      )
    )
);

COMMENT ON COLUMN public.communities.content_modes IS
  'List of enabled content generation modes (news, tips, discussion, ask, web-search).';
COMMENT ON COLUMN public.communities.content_mode_weights IS
  'Relative weights for each content mode for random selection.';
COMMENT ON COLUMN public.communities.generation_interval_minutes IS
  'How often to generate a thread, in minutes. NULL uses scheduler_config.default_interval_minutes.';
COMMENT ON COLUMN public.communities.min_comments_per_thread IS
  'Optional per-community override for minimum generated comments per thread. NULL uses scheduler default.';
COMMENT ON COLUMN public.communities.max_comments_per_thread IS
  'Optional per-community override for maximum generated comments per thread. NULL uses scheduler default.';
COMMENT ON COLUMN public.communities.last_generated_at IS
  'Timestamp of last successful thread generation. NULL means never generated.';
COMMENT ON COLUMN public.communities.search_scope IS
  'Optional site constraint for web search, such as wikipedia.org or github.com. NULL is unrestricted.';

CREATE TABLE public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  avatar_seed TEXT,
  personality_prompt TEXT NOT NULL,
  archetype TEXT,
  writing_style TEXT,
  scope TEXT NOT NULL DEFAULT 'global',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT personas_scope_check
    CHECK (scope IN ('global', 'scoped', 'excluded'))
);

CREATE TABLE public.persona_communities (
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  PRIMARY KEY (persona_id, community_id)
);

CREATE TABLE public.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  source_url TEXT,
  source_headline TEXT,
  comments_count INTEGER NOT NULL DEFAULT 0,
  flair TEXT,
  content_mode TEXT NOT NULL DEFAULT 'discussion',
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  is_safety_filtered BOOLEAN NOT NULL DEFAULT false,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  CONSTRAINT threads_comments_count_non_negative
    CHECK (comments_count >= 0)
);

COMMENT ON COLUMN public.threads.content_mode IS
  'The mode used to generate this thread.';
COMMENT ON COLUMN public.threads.is_safety_filtered IS
  'True if comment generation returned no comments, likely due to provider safety filters.';

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT comments_depth_non_negative
    CHECK (depth >= 0)
);

CREATE TABLE public.generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE,
  status TEXT,
  current_step TEXT DEFAULT NULL,
  model_used TEXT,
  searcher_model TEXT,
  generator_model TEXT,
  tokens_used INTEGER,
  error_message TEXT,
  trace JSONB NOT NULL DEFAULT '[]'::JSONB,
  search_strategy TEXT CHECK (search_strategy IN ('native', 'injected', 'none')),
  inngest_event_id TEXT,
  inngest_run_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.generation_logs.current_step IS
  'Updated at each Inngest step: setup | routing | generating | saving | done.';
COMMENT ON COLUMN public.generation_logs.inngest_event_id IS
  'Inngest event ID returned by inngest.send() or step.sendEvent(); used to fetch run details.';
COMMENT ON COLUMN public.generation_logs.inngest_run_id IS
  'Most recent Inngest function run ID associated with this generation log.';

CREATE TABLE public.ai_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'gemini',
  base_url TEXT,
  label TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  default_model TEXT NOT NULL,
  fallback_model TEXT,
  role TEXT NOT NULL,
  search_mode TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_configs_role_check
    CHECK (role IN ('generator', 'searcher', 'full')),
  CONSTRAINT ai_configs_search_mode_check
    CHECK (search_mode IN ('none', 'native', 'external', 'native_with_fallback'))
);

CREATE TABLE public.search_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  encrypted_key TEXT,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT search_configs_provider_check
    CHECK (provider IN ('tavily', 'brave', 'serper', 'exa', 'google_pse', 'none'))
);

COMMENT ON TABLE public.search_configs IS
  'External search provider configs decoupled from LLM configs.';
COMMENT ON COLUMN public.search_configs.provider IS
  'Search backend: tavily, brave, serper, exa, google_pse, none.';
COMMENT ON COLUMN public.search_configs.encrypted_key IS
  'API key for the search provider. Nullable when provider is none.';

CREATE TABLE public.scheduler_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  max_per_run INTEGER NOT NULL DEFAULT 3,
  default_interval_minutes INTEGER NOT NULL DEFAULT 240,
  default_min_comments_per_thread INTEGER NOT NULL DEFAULT 4,
  default_max_comments_per_thread INTEGER NOT NULL DEFAULT 8,
  sidebar_generation_button_enabled BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT scheduler_config_positive_intervals
    CHECK (default_interval_minutes > 0),
  CONSTRAINT scheduler_config_run_limits
    CHECK (max_per_run >= 0),
  CONSTRAINT scheduler_config_comment_defaults_valid
    CHECK (
      default_min_comments_per_thread >= 0
      AND default_max_comments_per_thread >= 0
      AND default_min_comments_per_thread <= default_max_comments_per_thread
    )
);

COMMENT ON COLUMN public.scheduler_config.default_interval_minutes IS
  'Global fallback interval when a community has no generation_interval_minutes set.';
COMMENT ON COLUMN public.scheduler_config.max_per_run IS
  'Safety cap: max communities triggered per cron tick regardless of how many are due.';
COMMENT ON COLUMN public.scheduler_config.default_min_comments_per_thread IS
  'Global fallback minimum generated comments per thread.';
COMMENT ON COLUMN public.scheduler_config.default_max_comments_per_thread IS
  'Global fallback maximum generated comments per thread.';
COMMENT ON COLUMN public.scheduler_config.sidebar_generation_button_enabled IS
  'Shows authenticated admins a manual generation button next to communities in the public sidebar.';
