ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS first_charge_date date,
  ADD COLUMN IF NOT EXISTS pause_months text[] NOT NULL DEFAULT '{}'::text[];