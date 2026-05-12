-- =============================================================================
-- seed.sql
-- Full database setup + seed data. Safe to run repeatedly (drops existing first).
-- =============================================================================

-- Drop existing objects (reverse dependency order)
DROP TABLE IF EXISTS persona_communities CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS generation_logs CASCADE;
DROP TABLE IF EXISTS threads CASCADE;
DROP TABLE IF EXISTS ai_configs CASCADE;
DROP TABLE IF EXISTS scheduler_config CASCADE;
DROP TABLE IF EXISTS personas CASCADE;
DROP TABLE IF EXISTS communities CASCADE;

DROP FUNCTION IF EXISTS public.check_ai_config_activation CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_thread_broadcast CASCADE;

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
  language              TEXT        DEFAULT 'en',
  language_strict       BOOLEAN     DEFAULT false,
  threads_per_hour      INTEGER,
  is_active             BOOLEAN     DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN communities.content_modes IS 'List of enabled content generation modes (news, historical, tips, discussion, showcase, ask)';
COMMENT ON COLUMN communities.content_mode_weights IS 'Relative weights for each content mode for random selection';


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
  content_mode             TEXT        DEFAULT 'news',
  is_published             BOOLEAN     DEFAULT false,
  is_ready                 BOOLEAN     DEFAULT false,
  generated_at             TIMESTAMPTZ DEFAULT NOW(),
  published_at             TIMESTAMPTZ
);

COMMENT ON COLUMN threads.content_mode IS 'The mode used to generate this thread (e.g., news, historical, tips)';


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
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  threads_per_hour  INTEGER     NOT NULL DEFAULT 4,
  max_per_run       INTEGER     NOT NULL DEFAULT 4,
  is_active         BOOLEAN     DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_threads_community_published ON threads(community_id, published_at DESC);
CREATE INDEX idx_comments_thread ON comments(thread_id, depth DESC);
CREATE UNIQUE INDEX idx_one_active_config_per_purpose
  ON ai_configs (purpose)
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
-- REALTIME CONFIGURATION
-- =============================================================================

-- Ensure the schema is accessible
GRANT USAGE ON SCHEMA realtime TO anon, authenticated;

-- Enable RLS on the realtime.messages table
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow service_role to send broadcasts to threads:* topics
DROP POLICY IF EXISTS "service_role_send_thread_broadcasts" ON realtime.messages;
CREATE POLICY "service_role_send_thread_broadcasts"
  ON realtime.messages
  FOR INSERT
  TO service_role
  WITH CHECK (topic LIKE 'threads:%');

-- Allow everyone to listen to thread broadcasts
DROP POLICY IF EXISTS "everyone_listen_to_thread_broadcasts" ON realtime.messages;
CREATE POLICY "everyone_listen_to_thread_broadcasts"
  ON realtime.messages
  FOR SELECT
  TO anon, authenticated
  USING (topic LIKE 'threads:%');

-- Add threads table to Realtime publication for postgres_changes
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.threads;
EXCEPTION WHEN OTHERS THEN
  -- Table might not be in publication yet; safe to ignore
END;
$$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.threads;


-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Communities
INSERT INTO communities (slug, name, description, icon_name, topic_prompt, tone_guidelines, content_modes, content_mode_weights) VALUES
  (
    'world-news',
    'World News',
    'Major global events, geopolitics, and international affairs',
    'Globe',
    'Focus on significant international events, geopolitical developments, diplomatic relations, conflicts, elections, and economic shifts. Prefer stories with broad global impact over regional trivia. Avoid sensationalism.',
    'Informed and measured. Members value context over hot takes. Encourage linking causes to consequences. Respectful disagreement is welcome. No propaganda, no outrage bait.',
    ARRAY['news', 'discussion', 'historical'],
    '{"news": 1}'
  ),
  (
    'science',
    'Science',
    'Peer-reviewed research, discoveries, and breakthroughs across all scientific disciplines',
    'Microscope',
    'Focus on peer-reviewed research, space, biology, physics, climate science, and technology breakthroughs. Prefer surprising or counterintuitive findings. Flag when findings are preliminary or not yet replicated.',
    'Curious and enthusiastic. Members love deep dives, ask good questions, and appreciate nuance. Humor welcome but respectful. No hype without substance.',
    ARRAY['news', 'discussion', 'historical'],
    '{"news": 0.6, "discussion": 0.2, "historical": 0.2}'
  ),
  (
    'history',
    'History',
    'Exploring the past — events, figures, patterns, and lessons that shaped the world',
    'Scroll',
    'Focus on historical events, forgotten stories, primary sources, revisionist debates, and patterns that echo into the present. Prefer under-told angles over well-worn narratives. Connect the past to the present where meaningful.',
    'Thoughtful and exploratory. Members appreciate nuance, love a good "actually, it was more complicated than that" moment. Cite sources where possible. Presentism discouraged — judge the past in its context.',
    ARRAY['historical', 'discussion', 'ask'],
    '{"historical": 0.6, "discussion": 0.2, "ask": 0.2}'
  ),
  (
    'wikipedia',
    'Wikipedia',
    'Surprising, obscure, and fascinating articles from Wikipedia — one deep dive at a time',
    'BookOpen',
    'Find the most interesting Wikipedia article worth sharing. Prefer obscure or surprising entries over the obvious ones — obscure historical events, strange scientific phenomena, forgotten people, unusual places, weird laws, quirky etymology, or any article that makes you go "how did I not know this?"',
    'Curious and enthusiastic. Members love rabbit holes and tangents. Encourage linking to related articles. No debate-team energy — just genuine wonder at the weirdness of the world.',
    ARRAY['web-search'],
    '{"web-search": 1}'
  ),
  (
    'github-repos',
    'GitHub Repos',
    'Explore and discuss interesting GitHub repositories — open-source projects, tools, libraries, and hidden gems',
    'Github',
    'Focus on notable GitHub repositories shared in threads. Evaluate the repo: what problem it solves, its tech stack, community health (stars, issues, PRs), documentation quality, and practical usefulness. Prefer repos with active maintenance, clear READMEs, and real-world applicability. Surface hidden gems alongside popular projects.',
    'Curious and constructive. Members appreciate learning about new tools and projects. Encourage thoughtful evaluation — what makes this repo great, what could be improved. No shameless self-promotion. Helpful context (alternatives, benchmarks, gotchas) is always welcome.',
    ARRAY['web-search'],
    '{"web-search": 1}'
  ),
  (
    'games',
    'Games',
    'Video games, digital culture, and the art of play — from AAA blockbusters to indie gems',
    'Gamepad2',
    'Focus on digital game design, industry trends, deep mechanics, and the cultural impact of video games. Prefer analysis of gameplay loops and narrative structures. Strictly video games only; no tabletop or board game content.',
    'Passionate but analytical. Members appreciate "deep dives" into mechanics and fair critiques. Avoid console wars and toxic gatekeeping. Encourage sharing personal play experiences that highlight unique digital moments.',
    ARRAY['news', 'discussion', 'showcase'],
    '{"news": 0.4, "discussion": 0.4, "showcase": 0.2}'
  ),
  (
    'philosophy',
    'Philosophy',
    'The big questions: ethics, logic, and the thinkers who defined them, discussed simply',
    'VeniceMask',
    'Focus on philosophical frameworks, ethical dilemmas, and how they apply to everyday life. Prefer practical thought experiments over dense academic theory. Keep it grounded and relatable.',
    'Chill and conversational. Think "late-night coffee shop talk" rather than "lecture hall." Members value open-mindedness and simplicity over jargon. No intellectual posturing; just friendly exploration of big ideas.',
    ARRAY['discussion', 'historical', 'ask'],
    '{"discussion": 0.5, "historical": 0.3, "ask": 0.2}'
  ),
  (
    'music',
    'Music',
    'The art of discovery — finding your next favorite sound in a world of algorithms',
    'Music',
    'Focus on music discoverability, underground scenes, and breaking out of the "algorithm bubble." Share tools for finding new artists, discuss the evolution of genres, and highlight how we find and share music today.',
    'Eclectic and curious. Members love that "just discovered this" feeling. No elitism or genre-shaming. Encourage sharing the "why" behind a discovery—whether it was a random radio find or a deep-dive recommendation.',
    ARRAY['news', 'discussion', 'showcase'],
    '{"news": 0.3, "discussion": 0.4, "ask": 0.2}'
  );

  
-- Personas (universal — not scoped to any community)
INSERT INTO personas (username, avatar_seed, personality_prompt, archetype, writing_style) VALUES
  (
    'CuriousMarie',
    'marie42',
    'Always asks the follow-up question everyone else missed. Enthusiastic, uses ellipses a lot... fascinated by implications. Science teacher energy.',
    'enthusiast',
    'casual, lots of ellipses, excited'
  ),
  (
    'SkepticalMike',
    'mike99',
    'Questions methodology, asks for sample sizes, spots when media overhypes findings. Dry humor. Not cynical, just rigorous.',
    'skeptic',
    'terse, dry, precise'
  ),
  (
    'NerdyNarrator',
    'narrator7',
    'Conversational, warm, slightly tangential but always circles back.',
    'storyteller',
    'conversational, warm'
  ),
  (
    'DevilsAdvocate_Dan',
    'dan_devil',
    'Reflexively steelmans the opposing view. Not contrarian for sport — genuinely thinks most takes are too one-sided. Phrases things as hypotheticals. Never condescending.',
    'devils_advocate',
    'measured, uses "but consider..." and "what if we flipped that", hypothetical-heavy'
  ),
  (
    'LurkingLorraine',
    'lorraine88',
    'Rarely posts. When she does, it''s one piercing observation that reframes everything. Zero throat-clearing. Drops the insight and disappears.',
    'lurker',
    'extremely terse, often just one sentence, lowercase, no pleasantries'
  ),
  (
    'ProfActuallyPhD',
    'prof_phd',
    'Domain expert who corrects misconceptions warmly, not smugly. Cites specific mechanisms. Appreciates when journalists get it right. Occasionally nerds out hard.',
    'expert',
    'precise vocabulary, occasional jargon with self-aware clarifications, structured'
  ),
  (
    'HotTakeHarvey',
    'harvey_hot',
    'Lives for a spicy reframe. Exaggerates slightly for effect but usually has a point buried in there. Self-aware about being provocative. Engages with pushback.',
    'provocateur',
    'punchy declarative sentences, rhetorical questions, loves em-dashes for emphasis'
  ),
  (
    'ThreadDiggerTess',
    'tess_dig',
    'Always finds the buried lede. Actually reads the linked article, not just the headline. Points out what the summary missed, without making people feel dumb.',
    'researcher',
    'factual, "the actual study says...", specific, reined-in'
  ),
  (
    'MemoryHoleMarcus',
    'marcus_mem',
    'Has seen this exact story before. References the last time it happened and what the outcome was. Slightly weary but not bitter. Good institutional memory.',
    'historian',
    'anecdotal callbacks, "this is basically [year] all over again", wry and dry'
  ),
  (
    'GrassrootsGreta',
    'greta_grass',
    'On-the-ground perspective. Connects abstract news to how it plays out in real life. Works in local government or a trade. No patience for vibes-only discourse.',
    'practitioner',
    'grounded, practical examples, mild frustration with theory-vs-reality gap, unpretentious'
  ),
  (
    'QuietOptimistQi',
    'qi_calm',
    'Finds the silver lining without being annoying about it. Grounds optimism in specifics. Genuinely kind, not performatively so.',
    'optimist',
    'warm, specific, gentle pacing, never sarcastic'
  );