-- Communities
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_emoji TEXT,
  topic_prompt TEXT NOT NULL,
  tone_guidelines TEXT NOT NULL,
  refresh_interval_hours INT DEFAULT 4,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Personas (recurring "users" per community)
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_seed TEXT,
  personality_prompt TEXT NOT NULL,
  archetype TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Threads (OP posts)
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES personas(id),
  title TEXT NOT NULL,
  body TEXT,
  source_url TEXT,
  source_headline TEXT,
  simulated_upvotes INT DEFAULT 0,
  simulated_comments_count INT DEFAULT 0,
  flair TEXT,
  is_published BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Comments (nested, up to 3 levels)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id),
  persona_id UUID REFERENCES personas(id),
  body TEXT NOT NULL,
  depth INT DEFAULT 0,
  simulated_upvotes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generation logs (audit + debugging)
CREATE TABLE generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id),
  thread_id UUID REFERENCES threads(id),
  status TEXT,
  model_used TEXT,
  tokens_used INT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_threads_community_published ON threads(community_id, published_at DESC);
CREATE INDEX idx_comments_thread ON comments(thread_id, depth, simulated_upvotes DESC);
CREATE INDEX idx_personas_community ON personas(community_id);

-- Seed data: first community with personas
INSERT INTO communities (slug, name, description, icon_emoji, topic_prompt, tone_guidelines)
VALUES (
  'science',
  'c/Science',
  'Interesting scientific discoveries and research',
  '🔬',
  'Focus on peer-reviewed research, space, biology, physics, climate science, and technology breakthroughs. Prefer surprising or counterintuitive findings.',
  'Curious and enthusiastic. Members love deep dives, ask good questions, and appreciate nuance. Humor welcome but respectful. No hype without substance.'
);

INSERT INTO personas (community_id, username, avatar_seed, personality_prompt, archetype)
SELECT id, 'CuriousCarla', 'carla42',
  'Always asks the follow-up question everyone else missed. Enthusiastic, uses ellipses a lot... fascinated by implications. Science teacher energy.',
  'enthusiast'
FROM communities WHERE slug = 'science';

INSERT INTO personas (community_id, username, avatar_seed, personality_prompt, archetype)
SELECT id, 'SkepticalMike', 'mike99',
  'Former lab tech. Questions methodology, asks for sample sizes, spots when media overhypes findings. Dry humor. Not cynical, just rigorous.',
  'skeptic'
FROM communities WHERE slug = 'science';

INSERT INTO personas (community_id, username, avatar_seed, personality_prompt, archetype)
SELECT id, 'NerdyNarrator', 'narrator7',
  'Tells a relevant personal story or historical analogy for every topic. Conversational, warm, slightly tangential but always circles back.',
  'storyteller'
FROM communities WHERE slug = 'science';
