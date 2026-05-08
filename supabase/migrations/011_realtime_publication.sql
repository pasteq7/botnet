-- =============================================================================
-- Add threads table to Realtime publication for postgres_changes
-- =============================================================================
-- The FeedWithModal component uses postgres_changes to listen for UPDATE
-- events on the threads table (specifically when is_ready flips to true).
-- This requires the table to be in the Realtime publication.
-- =============================================================================

-- Ensure the publication exists and add the threads table
ALTER PUBLICATION supabase_realtime ADD TABLE public.threads;
