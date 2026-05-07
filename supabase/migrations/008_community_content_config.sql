-- migration 008_community_content_config.sql

ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS content_modes TEXT[] DEFAULT ARRAY['news'],
  ADD COLUMN IF NOT EXISTS content_mode_weights JSONB DEFAULT '{"news": 1.0}',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS language_strict BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN communities.content_modes IS 'List of enabled content generation modes (news, historical, tips, discussion, showcase, ask)';
COMMENT ON COLUMN communities.content_mode_weights IS 'Relative weights for each content mode for random selection';
