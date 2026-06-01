
ALTER TABLE public.debt_items
  ADD COLUMN IF NOT EXISTS business_split_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_name text;

ALTER TABLE public.debt_items
  DROP CONSTRAINT IF EXISTS debt_items_business_split_pct_check;
ALTER TABLE public.debt_items
  ADD CONSTRAINT debt_items_business_split_pct_check
  CHECK (business_split_pct >= 0 AND business_split_pct <= 100);
