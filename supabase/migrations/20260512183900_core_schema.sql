-- =============================================================================
-- 20260512183900_core_schema.sql
-- Core database setup: Tables, RLS, Functions, Triggers, Realtime.
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
  generation_interval_minutes INTEGER DEFAULT NULL,
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
  generated_at             TIMESTAMPTZ DEFAULT NOW(),
  published_at             TIMESTAMPTZ
);

COMMENT ON COLUMN threads.content_mode IS 'The mode used to generate this thread (e.g., news, tips)';


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
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id  UUID        REFERENCES communities(id) ON DELETE CASCADE,
  thread_id     UUID        REFERENCES threads(id) ON DELETE CASCADE,
  status        TEXT,
  model_used    TEXT,
  model_search  TEXT,
  model_gen     TEXT,
  tokens_used   INT,
  error_message TEXT,
  trace         JSONB       DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE ai_configs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider       TEXT        NOT NULL DEFAULT 'gemini',
  label          TEXT        NOT NULL,
  encrypted_key  TEXT        NOT NULL,
  default_model  TEXT        NOT NULL,
  fallback_model TEXT,
  purpose        TEXT        DEFAULT 'any' NOT NULL CHECK (purpose IN ('any', 'search', 'generation')),
  is_active      BOOLEAN     DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


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
CREATE UNIQUE INDEX idx_one_active_config_per_purpose
  ON ai_configs (purpose)
  WHERE is_active = true;
CREATE INDEX idx_communities_last_generated
  ON communities(last_generated_at ASC NULLS FIRST)
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

-- AI Configs: authenticated admin full management
CREATE POLICY "admin_manage_ai_configs"
  ON ai_configs FOR ALL
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

-- Prevent 'any' purpose from coexisting with 'search'/'generation' configs
CREATE OR REPLACE FUNCTION public.check_ai_config_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  conflicting INTEGER;
BEGIN
  IF NOT NEW.is_active THEN
    RETURN NEW;
  END IF;

  IF NEW.purpose = 'any' THEN
    SELECT COUNT(*) INTO conflicting
    FROM public.ai_configs
    WHERE is_active = true AND purpose IN ('search', 'generation')
      AND (TG_OP = 'INSERT' OR id != NEW.id);
    IF conflicting > 0 THEN
      RAISE EXCEPTION 'Cannot activate "any" config while a "search" or "generation" config is active. Deactivate specialized configs first.';
    END IF;
  ELSIF NEW.purpose IN ('search', 'generation') THEN
    SELECT COUNT(*) INTO conflicting
    FROM public.ai_configs
    WHERE is_active = true AND purpose = 'any'
      AND (TG_OP = 'INSERT' OR id != NEW.id);
    IF conflicting > 0 THEN
      RAISE EXCEPTION 'Cannot activate "search" or "generation" config while an "any" config is active. Deactivate the "any" config first.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ai_config_activation
  BEFORE INSERT OR UPDATE ON ai_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_ai_config_activation();


CREATE OR REPLACE FUNCTION public.handle_new_thread_broadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Global channel – home feed subscribes here
  PERFORM realtime.send(
    jsonb_build_object(
      'thread_id',    NEW.id,
      'community_id', NEW.community_id
    ),
    'NEW_THREAD',
    'threads:all',
    false
  );

  -- Community-scoped channel – individual community feeds subscribe here
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
-- Note: This is required because RLS policies only work if the role has table-level SELECT/INSERT/etc permissions first.
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
