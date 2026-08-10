ALTER TABLE public.retirement_accounts
  ADD COLUMN IF NOT EXISTS portfolio_class TEXT NOT NULL DEFAULT 'retirement',
  ADD COLUMN IF NOT EXISTS custodian TEXT,
  ADD COLUMN IF NOT EXISTS plan_type TEXT,
  ADD COLUMN IF NOT EXISTS default_asset_class TEXT;

ALTER TABLE public.retirement_statements
  ADD COLUMN IF NOT EXISTS other_contributions NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dividend_income NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interest_income NUMERIC NOT NULL DEFAULT 0;

CREATE TABLE public.investment_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.retirement_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ticker TEXT,
  asset_type TEXT NOT NULL DEFAULT 'other',
  asset_class TEXT,
  quantity NUMERIC,
  average_cost NUMERIC,
  current_price NUMERIC,
  current_value NUMERIC NOT NULL DEFAULT 0,
  cost_basis NUMERIC,
  contributions NUMERIC NOT NULL DEFAULT 0,
  withdrawals NUMERIC NOT NULL DEFAULT 0,
  dividends NUMERIC NOT NULL DEFAULT 0,
  interest NUMERIC NOT NULL DEFAULT 0,
  monthly_contribution NUMERIC NOT NULL DEFAULT 0,
  purchased_at DATE,
  reported_return NUMERIC,
  as_of_date DATE,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_positions TO authenticated;
GRANT ALL ON public.investment_positions TO service_role;
ALTER TABLE public.investment_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view investment positions"
  ON public.investment_positions FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can create investment positions"
  ON public.investment_positions FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update investment positions"
  ON public.investment_positions FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete investment positions"
  ON public.investment_positions FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_investment_positions_updated_at
  BEFORE UPDATE ON public.investment_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_investment_positions_household ON public.investment_positions (household_id);
CREATE INDEX idx_investment_positions_account ON public.investment_positions (account_id);

CREATE TABLE public.investment_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  scope TEXT NOT NULL DEFAULT 'self_directed',
  planned_monthly NUMERIC NOT NULL DEFAULT 0,
  annual_goal NUMERIC NOT NULL DEFAULT 0,
  allocation JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_goals TO authenticated;
GRANT ALL ON public.investment_goals TO service_role;
ALTER TABLE public.investment_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view investment goals"
  ON public.investment_goals FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can create investment goals"
  ON public.investment_goals FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update investment goals"
  ON public.investment_goals FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete investment goals"
  ON public.investment_goals FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_investment_goals_updated_at
  BEFORE UPDATE ON public.investment_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_investment_goals_household ON public.investment_goals (household_id);