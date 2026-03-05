
-- Debt payoff plans
CREATE TABLE public.debt_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Debt Plan',
  strategy TEXT NOT NULL DEFAULT 'avalanche',
  extra_payment NUMERIC NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual debt items within a plan
CREATE TABLE public.debt_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.debt_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  interest_rate NUMERIC NOT NULL DEFAULT 0,
  minimum_payment NUMERIC NOT NULL DEFAULT 0,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for debt_plans
ALTER TABLE public.debt_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view debt plans"
  ON public.debt_plans FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert debt plans"
  ON public.debt_plans FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can update debt plans"
  ON public.debt_plans FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete debt plans"
  ON public.debt_plans FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- RLS for debt_items (via plan's household)
ALTER TABLE public.debt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view debt items"
  ON public.debt_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.debt_plans p
    WHERE p.id = debt_items.plan_id
    AND is_household_member(auth.uid(), p.household_id)
  ));

CREATE POLICY "Members can insert debt items"
  ON public.debt_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.debt_plans p
    WHERE p.id = debt_items.plan_id
    AND is_household_member(auth.uid(), p.household_id)
  ));

CREATE POLICY "Members can update debt items"
  ON public.debt_items FOR UPDATE TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.debt_plans p
    WHERE p.id = debt_items.plan_id
    AND is_household_member(auth.uid(), p.household_id)
  ));

CREATE POLICY "Members can delete debt items"
  ON public.debt_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.debt_plans p
    WHERE p.id = debt_items.plan_id
    AND is_household_member(auth.uid(), p.household_id)
  ));
