-- Rename tables and columns from Reddit terminology to generic naming
-- This migration handles existing databases where the old names are in use.

-- Rename the main table
ALTER TABLE IF EXISTS subreddits RENAME TO communities;

-- Rename columns in threads
ALTER TABLE IF EXISTS threads RENAME COLUMN subreddit_id TO community_id;

-- Rename columns in generation_logs
ALTER TABLE IF EXISTS generation_logs RENAME COLUMN subreddit_id TO community_id;

-- Rename indexes
ALTER INDEX IF EXISTS idx_threads_subreddit_published RENAME TO idx_threads_community_published;
ALTER INDEX IF EXISTS idx_personas_subreddit RENAME TO idx_personas_community;

-- Recreate foreign key constraints with new naming
ALTER TABLE IF EXISTS threads
  DROP CONSTRAINT IF EXISTS threads_subreddit_id_fkey,
  ADD CONSTRAINT threads_community_id_fkey FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS generation_logs
  DROP CONSTRAINT IF EXISTS generation_logs_subreddit_id_fkey,
  ADD CONSTRAINT generation_logs_community_id_fkey FOREIGN KEY (community_id) REFERENCES communities(id);

-- Drop old personas constraint (may still exist in some schemas)
ALTER TABLE IF EXISTS personas
  DROP CONSTRAINT IF EXISTS personas_subreddit_id_fkey;

-- Update RLS policies for the renamed table
ALTER POLICY IF EXISTS "Allow public read access for subreddits" ON communities RENAME TO "Allow public read access for communities";
ALTER POLICY IF EXISTS "Allow admin manage subreddits" ON communities RENAME TO "Allow admin manage communities";

-- Update column comments
COMMENT ON COLUMN communities.content_modes IS 'List of enabled content generation modes (news, historical, tips, discussion, showcase, ask)';
COMMENT ON COLUMN communities.content_mode_weights IS 'Relative weights for each content mode for random selection';
