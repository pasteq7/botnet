-- migration 009_thread_mode_tracking.sql

ALTER TABLE threads 
  ADD COLUMN IF NOT EXISTS content_mode TEXT DEFAULT 'news';

-- Add comment
COMMENT ON COLUMN threads.content_mode IS 'The mode used to generate this thread (e.g., news, historical, tips)';
