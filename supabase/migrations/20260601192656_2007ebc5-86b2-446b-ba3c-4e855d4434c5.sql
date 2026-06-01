
ALTER TABLE public.debt_items
  ADD COLUMN IF NOT EXISTS deferred_until date,
  ADD COLUMN IF NOT EXISTS forgiveness_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forgiveness_date date,
  ADD COLUMN IF NOT EXISTS forgiveness_note text;
