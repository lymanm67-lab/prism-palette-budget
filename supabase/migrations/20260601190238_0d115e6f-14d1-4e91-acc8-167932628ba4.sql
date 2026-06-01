ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS business_split_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_business_split_pct_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_business_split_pct_check CHECK (business_split_pct >= 0 AND business_split_pct <= 100);