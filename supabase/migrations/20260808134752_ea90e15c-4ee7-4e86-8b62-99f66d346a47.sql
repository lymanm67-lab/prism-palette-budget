ALTER TABLE public.health_daily_logs
  ADD COLUMN IF NOT EXISTS mindfulness_minutes integer,
  ADD COLUMN IF NOT EXISTS mindfulness_type text,
  ADD COLUMN IF NOT EXISTS intention_note text,
  ADD COLUMN IF NOT EXISTS kickstart_steps jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS workout_sessions jsonb NOT NULL DEFAULT '[]'::jsonb;