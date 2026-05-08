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
-- 3. Realtime Security (Broadcast RLS)
-- ---------------------------------------------------------------------------

-- Ensure the schema is accessible
GRANT USAGE ON SCHEMA realtime TO anon, authenticated;

-- 3.1 Enable RLS on the realtime.messages table
-- Note: If your environment uses partitions (e.g. messages_YYYY_MM_DD), 
-- these policies will generally propagate or need to be applied to child tables.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- 3.2 Allow service_role to send broadcasts to threads:* topics
-- Note: postgres (superuser) bypasses RLS, so the database trigger still works.
DROP POLICY IF EXISTS "service_role_send_thread_broadcasts" ON realtime.messages;
CREATE POLICY "service_role_send_thread_broadcasts"
  ON realtime.messages
  FOR INSERT
  TO service_role
  WITH CHECK (topic LIKE 'threads:%');

-- 3.3 Allow everyone to listen to thread broadcasts
DROP POLICY IF EXISTS "everyone_listen_to_thread_broadcasts" ON realtime.messages;
CREATE POLICY "everyone_listen_to_thread_broadcasts"
  ON realtime.messages
  FOR SELECT
  TO anon, authenticated
  USING (topic LIKE 'threads:%');

