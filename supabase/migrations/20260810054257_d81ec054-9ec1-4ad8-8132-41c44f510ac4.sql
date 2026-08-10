ALTER TABLE public.health_daily_logs
  ADD COLUMN IF NOT EXISTS scorecard jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS resting_hr integer,
  ADD COLUMN IF NOT EXISTS bp_systolic integer,
  ADD COLUMN IF NOT EXISTS bp_diastolic integer,
  ADD COLUMN IF NOT EXISTS awakenings integer,
  ADD COLUMN IF NOT EXISTS sleep_quality integer,
  ADD COLUMN IF NOT EXISTS journal_note text;