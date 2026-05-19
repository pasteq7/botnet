-- Store the Inngest event/run identifiers used by the admin activity log.

ALTER TABLE generation_logs
  ADD COLUMN IF NOT EXISTS inngest_event_id TEXT,
  ADD COLUMN IF NOT EXISTS inngest_run_id TEXT;

CREATE INDEX IF NOT EXISTS idx_generation_logs_inngest_event_id
  ON generation_logs(inngest_event_id)
  WHERE inngest_event_id IS NOT NULL;

COMMENT ON COLUMN generation_logs.inngest_event_id IS
  'Inngest event ID returned by inngest.send() or step.sendEvent(); used to fetch run details.';

COMMENT ON COLUMN generation_logs.inngest_run_id IS
  'Most recent Inngest function run ID associated with this generation log.';
