
-- 1. Add normalized_merchant to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS normalized_merchant text;

-- 2. Create subscriptions table for detected recurring subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  merchant text NOT NULL,
  normalized_merchant text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  frequency text NOT NULL DEFAULT 'monthly',
  average_amount numeric NOT NULL DEFAULT 0,
  last_charge_date date,
  next_expected_date date,
  is_active boolean NOT NULL DEFAULT true,
  is_cancelled boolean NOT NULL DEFAULT false,
  cancel_reminder_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update subscriptions" ON public.subscriptions FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete subscriptions" ON public.subscriptions FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

-- 3. Create financial_insights table
CREATE TABLE public.financial_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  message text NOT NULL,
  insight_type text NOT NULL DEFAULT 'spending',
  severity text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view insights" ON public.financial_insights FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert insights" ON public.financial_insights FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update insights" ON public.financial_insights FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete insights" ON public.financial_insights FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

-- 4. Create merchant_normalizations lookup table
CREATE TABLE public.merchant_normalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_pattern text NOT NULL,
  normalized_name text NOT NULL,
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE,
  is_global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(raw_pattern, household_id)
);

ALTER TABLE public.merchant_normalizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view normalizations" ON public.merchant_normalizations FOR SELECT TO authenticated USING (is_global OR is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert normalizations" ON public.merchant_normalizations FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update normalizations" ON public.merchant_normalizations FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete normalizations" ON public.merchant_normalizations FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

-- 5. Add provider_type to plaid_items (for multi-provider support)
ALTER TABLE public.plaid_items ADD COLUMN IF NOT EXISTS provider_type text NOT NULL DEFAULT 'plaid';
