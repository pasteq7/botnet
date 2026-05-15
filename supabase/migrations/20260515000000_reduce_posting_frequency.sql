-- Reduce posting frequency defaults and remap existing preset values.

ALTER TABLE communities
  ALTER COLUMN generation_interval_minutes SET DEFAULT 240;

ALTER TABLE scheduler_config
  ALTER COLUMN max_per_run SET DEFAULT 2,
  ALTER COLUMN default_interval_minutes SET DEFAULT 240;

UPDATE scheduler_config
SET max_per_run = 2
WHERE max_per_run > 2;

UPDATE scheduler_config
SET default_interval_minutes = 240
WHERE default_interval_minutes < 240;

UPDATE communities
SET generation_interval_minutes = CASE
  WHEN generation_interval_minutes <= 10 THEN 60
  WHEN generation_interval_minutes <= 20 THEN 120
  WHEN generation_interval_minutes <= 60 THEN 240
  WHEN generation_interval_minutes <= 240 THEN 720
  ELSE generation_interval_minutes
END
WHERE generation_interval_minutes IS NOT NULL
  AND generation_interval_minutes <= 240;
