-- Clarify that Inngest IDs are retained for correlation only. Step details are
-- recorded in generation_logs.trace instead of fetched from the Inngest REST API.

COMMENT ON COLUMN public.generation_logs.inngest_event_id IS
  'Inngest event ID returned by inngest.send() or step.sendEvent(); used to correlate queued and completed generation logs.';

COMMENT ON COLUMN public.generation_logs.inngest_run_id IS
  'Most recent Inngest function run ID associated with this generation log, retained for external correlation.';
