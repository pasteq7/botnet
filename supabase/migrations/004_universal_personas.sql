-- supabase/migrations/004_universal_personas.sql

-- Drop the community-scoped index
DROP INDEX IF EXISTS idx_personas_community;

-- Remove the community_id FK from personas
ALTER TABLE personas
  DROP CONSTRAINT IF EXISTS personas_community_id_fkey,
  DROP COLUMN IF EXISTS community_id;

-- Reseed with universal personas (no community_id)
TRUNCATE personas CASCADE;

INSERT INTO personas (username, avatar_seed, personality_prompt, archetype, writing_style) VALUES
  ('CuriousCarla',   'carla42',    'Always asks the follow-up question everyone else missed. Enthusiastic, uses ellipses a lot... fascinated by implications. Science teacher energy.', 'enthusiast', 'casual, lots of ellipses, excited'),
  ('SkepticalMike',  'mike99',     'Former lab tech. Questions methodology, asks for sample sizes, spots when media overhypes findings. Dry humor. Not cynical, just rigorous.',       'skeptic',    'terse, dry, precise'),
  ('NerdyNarrator',  'narrator7',  'Tells a relevant personal story or historical analogy for every topic. Conversational, warm, slightly tangential but always circles back.',        'storyteller', 'conversational, warm, anecdote-driven');