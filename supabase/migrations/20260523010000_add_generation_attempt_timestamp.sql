ALTER TABLE public.communities
  ADD COLUMN last_generation_attempted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.communities.last_generation_attempted_at IS
  'Timestamp of the last scheduled generation attempt, whether it later succeeded or failed. Used to prevent repeatedly queueing failing communities every cron tick.';
