-- =============================================================================
-- 20260512183900_core_schema.sql
-- Core database setup: Tables, RLS, Functions, Triggers, Realtime.
-- Merged with 20260514000000_consolidate_config + 20260514000001_phase4_5_cleanup + 20260514000002_add_safety_filtered_flag
-- =============================================================================

-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE communities (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT        UNIQUE NOT NULL,
  name                  TEXT        NOT NULL,
  description           TEXT,
  icon_name             TEXT,
  topic_prompt          TEXT        NOT NULL,
  tone_guidelines       TEXT        NOT NULL,
  content_modes         TEXT[]      DEFAULT ARRAY['news'],
  content_mode_weights  JSONB       DEFAULT '{"news": 1.0}',
  language              TEXT        DEFAULT 'english',
  language_strict       BOOLEAN     DEFAULT false,
  generation_interval_minutes INTEGER DEFAULT 60,
  last_generated_at     TIMESTAMPTZ DEFAULT NULL,
  is_active             BOOLEAN     DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN communities.content_modes IS 'List of enabled content generation modes (news, tips, discussion, ask)';
COMMENT ON COLUMN communities.content_mode_weights IS 'Relative weights for each content mode for random selection';
COMMENT ON COLUMN communities.generation_interval_minutes IS 'How often to generate a thread (minutes). NULL = use scheduler default_interval_minutes.';
COMMENT ON COLUMN communities.last_generated_at IS 'Timestamp of last successful thread generation. NULL = never generated (always eligible).';


CREATE TABLE personas (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username          TEXT        NOT NULL,
  avatar_seed       TEXT,
  personality_prompt TEXT       NOT NULL,
  archetype         TEXT,
  writing_style     TEXT,
  scope             TEXT        DEFAULT 'global' NOT NULL CHECK (scope IN ('global', 'scoped')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE persona_communities (
  persona_id    UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  community_id  UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  PRIMARY KEY (persona_id, community_id)
);


CREATE TABLE threads (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id             UUID        NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  persona_id               UUID        REFERENCES personas(id),
  title                    TEXT        NOT NULL,
  body                     TEXT,
  source_url               TEXT,
  source_headline          TEXT,
  comments_count INT         DEFAULT 0,
  flair                    TEXT,
  content_mode             TEXT        DEFAULT 'discussion',
  is_published             BOOLEAN     DEFAULT false,
  is_ready                 BOOLEAN     DEFAULT false,
  is_safety_filtered       BOOLEAN     DEFAULT false,
  generated_at             TIMESTAMPTZ DEFAULT NOW(),
  published_at             TIMESTAMPTZ
);

COMMENT ON COLUMN threads.content_mode IS 'The mode used to generate this thread (e.g., news, tips)';
COMMENT ON COLUMN threads.is_safety_filtered IS 'True if comment generation returned 0 comments likely due to AI provider safety filters.';


CREATE TABLE comments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id         UUID        NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  parent_comment_id UUID        REFERENCES comments(id),
  persona_id        UUID        REFERENCES personas(id),
  body              TEXT        NOT NULL,
  depth             INT         DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE generation_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id     UUID        REFERENCES communities(id) ON DELETE CASCADE,
  thread_id        UUID        REFERENCES threads(id) ON DELETE CASCADE,
  status           TEXT,
  current_step     TEXT        DEFAULT NULL,
  model_used       TEXT,
  searcher_model   TEXT,
  generator_model  TEXT,
  tokens_used      INT,
  error_message    TEXT,
  trace            JSONB       DEFAULT '[]',
  search_strategy  TEXT        CHECK (search_strategy IN ('native', 'injected', 'none')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN generation_logs.current_step IS
  'Updated at each Inngest step: setup | routing | generating | saving | done';


CREATE TABLE ai_configs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider       TEXT        NOT NULL DEFAULT 'gemini',
  base_url       TEXT,
  label          TEXT        NOT NULL,
  encrypted_key  TEXT        NOT NULL,
  default_model  TEXT        NOT NULL,
  fallback_model TEXT,
  role           TEXT        NOT NULL CHECK (role IN ('generator', 'searcher', 'full')),
  search_mode    TEXT        NOT NULL CHECK (search_mode IN ('none', 'native', 'external', 'native_with_fallback')),
  is_active      BOOLEAN     DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE search_configs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT        NOT NULL CHECK (provider IN ('tavily', 'brave', 'serper', 'exa', 'google_pse', 'none')),
  encrypted_key   TEXT,
  label           TEXT        NOT NULL,
  is_active       BOOLEAN     DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE search_configs IS 'External search provider configs decoupled from LLM configs';
COMMENT ON COLUMN search_configs.provider IS 'Search backend: tavily, brave, serper, exa, google_pse, none';
COMMENT ON COLUMN search_configs.encrypted_key IS 'API key for the search provider (nullable if provider=none)';


CREATE TABLE scheduler_config (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  max_per_run             INTEGER     NOT NULL DEFAULT 4,
  default_interval_minutes INTEGER    NOT NULL DEFAULT 60,
  is_active               BOOLEAN     DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN scheduler_config.default_interval_minutes IS 'Global fallback interval when community has no generation_interval_minutes set.';
COMMENT ON COLUMN scheduler_config.max_per_run IS 'Safety cap: max communities triggered per cron tick regardless of how many are due.';


-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_threads_community_published ON threads(community_id, published_at DESC);
CREATE INDEX idx_comments_thread ON comments(thread_id, depth DESC);
CREATE UNIQUE INDEX idx_one_active_search_config
  ON search_configs ((true))
  WHERE is_active = true;

CREATE INDEX idx_communities_last_generated
  ON communities(last_generated_at ASC NULLS FIRST)
  WHERE is_active = true;

CREATE UNIQUE INDEX idx_one_active_per_role
  ON ai_configs (role)
  WHERE is_active = true;


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE communities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_configs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_configs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_config     ENABLE ROW LEVEL SECURITY;

-- Communities: public read all, authenticated full management
CREATE POLICY "public_read_communities"
  ON communities FOR SELECT
  USING (true);

CREATE POLICY "admin_manage_communities"
  ON communities FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Personas: public read, authenticated full management
CREATE POLICY "public_read_personas"
  ON personas FOR SELECT
  USING (true);

CREATE POLICY "admin_manage_personas"
  ON personas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Threads: public read published only
CREATE POLICY "public_read_published_threads"
  ON threads FOR SELECT
  USING (is_published = true);

CREATE POLICY "admin_manage_threads"
  ON threads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comments: public read all
CREATE POLICY "public_read_comments"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "admin_manage_comments"
  ON comments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Generation logs: public read all
CREATE POLICY "public_read_generation_logs"
  ON generation_logs FOR SELECT
  USING (true);

CREATE POLICY "no_client_writes_generation_logs"
  ON generation_logs FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- AI Configs: authenticated admin full management
CREATE POLICY "admin_manage_ai_configs"
  ON ai_configs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Search configs: authenticated admin full management
CREATE POLICY "admin_manage_search_configs"
  ON search_configs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Persona communities: public read, authenticated full management
CREATE POLICY "public_read_persona_communities"
  ON persona_communities FOR SELECT
  USING (true);

CREATE POLICY "admin_manage_persona_communities"
  ON persona_communities FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Scheduler config: public read, authenticated full management
CREATE POLICY "public_read_scheduler_config"
  ON scheduler_config FOR SELECT
  USING (true);

CREATE POLICY "admin_manage_scheduler_config"
  ON scheduler_config FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_thread_broadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Global channel -- home feed subscribes here
  PERFORM realtime.send(
    jsonb_build_object(
      'thread_id',    NEW.id,
      'community_id', NEW.community_id
    ),
    'NEW_THREAD',
    'threads:all',
    false
  );

  -- Community-scoped channel -- individual community feeds subscribe here
  PERFORM realtime.send(
    jsonb_build_object(
      'thread_id',    NEW.id,
      'community_id', NEW.community_id
    ),
    'NEW_THREAD',
    'threads:community:' || NEW.community_id::text,
    false
  );

  RETURN NEW;
END;
$$;

-- Fire only after Inngest finishes all processing (comments, etc.) and sets is_ready = true
CREATE TRIGGER on_thread_ready
  AFTER UPDATE OF is_ready ON public.threads
  FOR EACH ROW
  WHEN (NEW.is_ready = true AND OLD.is_ready = false)
  EXECUTE FUNCTION public.handle_new_thread_broadcast();


-- =============================================================================
-- GRANTS
-- =============================================================================

-- Ensure the roles have access to the public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions to existing tables for public access
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant permissions on sequences (for ID generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant permissions on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;


-- =============================================================================
-- REALTIME CONFIGURATION
-- =============================================================================

-- Ensure the schema is accessible (use DO block to handle cases where it might not exist or privileges already granted)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'realtime') THEN
    GRANT USAGE ON SCHEMA realtime TO anon, authenticated;
  END IF;
END $$;

-- Allow service_role to send broadcasts to threads:* topics
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'realtime' AND table_name = 'messages') THEN
    ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "service_role_send_thread_broadcasts" ON realtime.messages;
    CREATE POLICY "service_role_send_thread_broadcasts"
      ON realtime.messages
      FOR INSERT
      TO service_role
      WITH CHECK (topic LIKE 'threads:%');

    DROP POLICY IF EXISTS "everyone_listen_to_thread_broadcasts" ON realtime.messages;
    CREATE POLICY "everyone_listen_to_thread_broadcasts"
      ON realtime.messages
      FOR SELECT
      TO anon, authenticated
      USING (topic LIKE 'threads:%');
  END IF;
END $$;

-- Add threads table to Realtime publication for postgres_changes
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.threads;
EXCEPTION WHEN OTHERS THEN
  -- Table might not be in publication yet; safe to ignore
END;
$$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.threads;

-- Add generation_logs to Realtime publication so the overlay can track progress
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.generation_logs;
EXCEPTION WHEN OTHERS THEN
  -- Table might not be in publication yet; safe to ignore
END;
$$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_logs;
