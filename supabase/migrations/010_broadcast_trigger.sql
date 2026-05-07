-- =============================================================================
-- Real-time broadcast trigger for new threads
-- =============================================================================
-- Adds a trigger that broadcasts via realtime.send when a published thread
-- is inserted, so clients subscribed to broadcast channels get notified.
--
-- Also sets up Realtime RLS for broadcast channels.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Broadcast function
-- ---------------------------------------------------------------------------

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


-- ---------------------------------------------------------------------------
-- 2. Trigger
-- ---------------------------------------------------------------------------

-- Add is_ready column (needed so broadcast fires only after full Inngest processing)
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS is_ready BOOLEAN DEFAULT false;

-- Drop old INSERT-based trigger
DROP TRIGGER IF EXISTS on_thread_published ON public.threads;

-- New trigger: fires only after Inngest finishes all processing (comments, etc.)
-- and sets is_ready = true
CREATE TRIGGER on_thread_ready
  AFTER UPDATE OF is_ready ON public.threads
  FOR EACH ROW
  WHEN (NEW.is_ready = true AND OLD.is_ready = false)
  EXECUTE FUNCTION public.handle_new_thread_broadcast();


-- ---------------------------------------------------------------------------
-- 3. Realtime RLS for broadcast channels
-- ---------------------------------------------------------------------------
-- Allow anonymous clients to subscribe to the broadcast channels used by
-- the public feed. This is required because the app's public pages are
-- accessible without authentication.
--
-- NOTE: Channel-level RLS is managed via the Supabase Dashboard under
--       Realtime → Channel-level authorization. For this migration to work,
--       ensure the following channels are authorized for public access:
--         - threads:all
--         - threads:community:*   (wildcard pattern)
--
-- You can configure this manually in the dashboard OR run the following
-- helper query against the supabase_realtime publication if your Supabase
-- project version supports it:
--
--   GRANT USAGE ON SCHEMA realtime TO anon, authenticated;
--   GRANT ALL ON ALL TABLES IN SCHEMA realtime TO anon, authenticated;
--   (adjust for your project's security requirements)
--
-- As of Supabase Realtime v2+, broadcast channels are open to all
-- subscribers by default when no channel-level authorization rules are
-- configured, so this migration may work without manual intervention.
