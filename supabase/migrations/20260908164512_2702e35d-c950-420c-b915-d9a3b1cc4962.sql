ALTER TABLE public.freed_cash_sources
  ADD COLUMN IF NOT EXISTS billing_day integer,
  ADD COLUMN IF NOT EXISTS next_avoided_payment_date date;

ALTER TABLE public.freed_cash_month_snapshots
  ADD COLUMN IF NOT EXISTS verified_monthly numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reconciled_monthly numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_monthly numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pipeline_monthly numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_rate numeric NOT NULL DEFAULT 0;