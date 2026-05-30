ALTER TABLE public.recurring_transactions
  ADD COLUMN IF NOT EXISTS biller_url text,
  ADD COLUMN IF NOT EXISTS reminder_days integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS autopay_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_paid_date date;