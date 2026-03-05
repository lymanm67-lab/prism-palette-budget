
-- Recurring transactions
CREATE TABLE public.recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  merchant TEXT,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view recurring transactions" ON public.recurring_transactions FOR SELECT USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert recurring transactions" ON public.recurring_transactions FOR INSERT WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update recurring transactions" ON public.recurring_transactions FOR UPDATE USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete recurring transactions" ON public.recurring_transactions FOR DELETE USING (is_household_member(auth.uid(), household_id));

-- Split transactions (child allocations of a parent transaction)
CREATE TABLE public.transaction_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transaction_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view splits" ON public.transaction_splits FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND is_household_member(auth.uid(), t.household_id))
);
CREATE POLICY "Members can insert splits" ON public.transaction_splits FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND is_household_member(auth.uid(), t.household_id))
);
CREATE POLICY "Members can update splits" ON public.transaction_splits FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND is_household_member(auth.uid(), t.household_id))
);
CREATE POLICY "Members can delete splits" ON public.transaction_splits FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND is_household_member(auth.uid(), t.household_id))
);

-- Financial goals
CREATE TABLE public.financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  goal_type TEXT NOT NULL DEFAULT 'savings',
  target_date DATE,
  icon TEXT DEFAULT 'target',
  color TEXT DEFAULT '#0d9488',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view goals" ON public.financial_goals FOR SELECT USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert goals" ON public.financial_goals FOR INSERT WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update goals" ON public.financial_goals FOR UPDATE USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete goals" ON public.financial_goals FOR DELETE USING (is_household_member(auth.uid(), household_id));

-- Add is_transfer flag to transactions for internal transfers
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_transfer BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS transfer_pair_id UUID REFERENCES public.transactions(id);
