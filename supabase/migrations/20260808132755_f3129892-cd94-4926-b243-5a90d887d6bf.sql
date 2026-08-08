ALTER TABLE public.health_daily_logs
  ADD COLUMN IF NOT EXISTS exercise_calories NUMERIC NOT NULL DEFAULT 0;