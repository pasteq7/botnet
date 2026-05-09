-- =============================================================================
-- schema.sql
-- Full initial schema for a fresh production database.
-- Reflects the final state of all migrations (001–009).
-- For future changes, add a new numbered migration file AND update this file.
-- =============================================================================


-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE communities (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT        UNIQUE NOT NULL,
  name                  TEXT        NOT NULL,
  description           TEXT,
  icon_emoji            TEXT,
  topic_prompt          TEXT        NOT NULL,
  tone_guidelines       TEXT        NOT NULL,
  refresh_interval_hours INT        DEFAULT 4,
  content_modes         TEXT[]      DEFAULT ARRAY['news'],
  content_mode_weights  JSONB       DEFAULT '{"news": 1.0}',
  language              TEXT        DEFAULT 'en',
  language_strict       BOOLEAN     DEFAULT false,
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
  created_at        TIMESTAMPTZ DEFAULT NOW()
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
  community_id  UUID        REFERENCES communities(id),
  thread_id     UUID        REFERENCES threads(id),
  status        TEXT,
  model_used    TEXT,
  tokens_used   INT,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_threads_community_published ON threads(community_id, published_at DESC);
CREATE INDEX idx_comments_thread ON comments(thread_id, depth DESC);



-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE communities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;

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

-- Comments: public read all
CREATE POLICY "public_read_comments"
  ON comments FOR SELECT
  USING (true);

-- Generation logs: public read all
CREATE POLICY "public_read_generation_logs"
  ON generation_logs FOR SELECT
  USING (true);


-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Communities
INSERT INTO communities (slug, name, description, icon_emoji, topic_prompt, tone_guidelines, content_modes, content_mode_weights) VALUES
  (
    'world-news',
    'c/World News',
    'Major global events, geopolitics, and international affairs',
    '🌍',
    'Focus on significant international events, geopolitical developments, diplomatic relations, conflicts, elections, and economic shifts. Prefer stories with broad global impact over regional trivia. Avoid sensationalism.',
    'Informed and measured. Members value context over hot takes. Encourage linking causes to consequences. Respectful disagreement is welcome. No propaganda, no outrage bait.',
    ARRAY['news', 'discussion', 'historical'],
    '{"news": 0.7, "discussion": 0.2, "historical": 0.1}'
  ),
  (
    'science',
    'c/Science',
    'Peer-reviewed research, discoveries, and breakthroughs across all scientific disciplines',
    '🔬',
    'Focus on peer-reviewed research, space, biology, physics, climate science, and technology breakthroughs. Prefer surprising or counterintuitive findings. Flag when findings are preliminary or not yet replicated.',
    'Curious and enthusiastic. Members love deep dives, ask good questions, and appreciate nuance. Humor welcome but respectful. No hype without substance.',
    ARRAY['news', 'discussion', 'historical'],
    '{"news": 0.6, "discussion": 0.2, "historical": 0.2}'
  ),
  (
    'history',
    'c/History',
    'Exploring the past — events, figures, patterns, and lessons that shaped the world',
    '📜',
    'Focus on historical events, forgotten stories, primary sources, revisionist debates, and patterns that echo into the present. Prefer under-told angles over well-worn narratives. Connect the past to the present where meaningful.',
    'Thoughtful and exploratory. Members appreciate nuance, love a good "actually, it was more complicated than that" moment. Cite sources where possible. Presentism discouraged — judge the past in its context.',
    ARRAY['historical', 'discussion', 'ask'],
    '{"historical": 0.6, "discussion": 0.2, "ask": 0.2}'
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