CREATE TABLE public.reserve_funds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'emergency',
  name TEXT NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  institution_label TEXT,
  stage1_target NUMERIC NOT NULL DEFAULT 0,
  primary_target NUMERIC NOT NULL DEFAULT 0,
  ceiling_target NUMERIC NOT NULL DEFAULT 0,
  monthly_contribution NUMERIC NOT NULL DEFAULT 0,
  contributions_paused BOOLEAN NOT NULL DEFAULT false,
  essential_monthly_expenses NUMERIC NOT NULL DEFAULT 0,
  starting_balance NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reserve_funds TO authenticated;
GRANT ALL ON public.reserve_funds TO service_role;
ALTER TABLE public.reserve_funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view reserve funds" ON public.reserve_funds
  FOR SELECT TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can create reserve funds" ON public.reserve_funds
  FOR INSERT TO authenticated WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update reserve funds" ON public.reserve_funds
  FOR UPDATE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete reserve funds" ON public.reserve_funds
  FOR DELETE TO authenticated USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER trg_reserve_funds_updated BEFORE UPDATE ON public.reserve_funds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.reserve_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES public.reserve_funds(id) ON DELETE CASCADE,
  txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  direction TEXT NOT NULL DEFAULT 'contribution',
  reason TEXT,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reserve_transactions TO authenticated;
GRANT ALL ON public.reserve_transactions TO service_role;
ALTER TABLE public.reserve_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view reserve transactions" ON public.reserve_transactions
  FOR SELECT TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can create reserve transactions" ON public.reserve_transactions
  FOR INSERT TO authenticated WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update reserve transactions" ON public.reserve_transactions
  FOR UPDATE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete reserve transactions" ON public.reserve_transactions
  FOR DELETE TO authenticated USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER trg_reserve_transactions_updated BEFORE UPDATE ON public.reserve_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_reserve_funds_household ON public.reserve_funds(household_id, kind);
CREATE INDEX idx_reserve_txn_fund ON public.reserve_transactions(fund_id, txn_date DESC);