CREATE TABLE public.retirement_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  name TEXT NOT NULL,
  institution TEXT,
  account_kind TEXT NOT NULL DEFAULT 'employer_plan',
  fund_name TEXT,
  ticker TEXT,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  baseline_balance NUMERIC NOT NULL DEFAULT 0,
  baseline_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retirement_accounts TO authenticated;
GRANT ALL ON public.retirement_accounts TO service_role;
ALTER TABLE public.retirement_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view retirement accounts"
  ON public.retirement_accounts FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can create retirement accounts"
  ON public.retirement_accounts FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update retirement accounts"
  ON public.retirement_accounts FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete retirement accounts"
  ON public.retirement_accounts FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_retirement_accounts_updated_at
  BEFORE UPDATE ON public.retirement_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_retirement_accounts_household ON public.retirement_accounts (household_id);

CREATE TABLE public.retirement_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.retirement_accounts(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  statement_date DATE,
  beginning_balance NUMERIC NOT NULL DEFAULT 0,
  employee_contributions NUMERIC NOT NULL DEFAULT 0,
  employer_contributions NUMERIC NOT NULL DEFAULT 0,
  transfers_in NUMERIC NOT NULL DEFAULT 0,
  transfers_out NUMERIC NOT NULL DEFAULT 0,
  withdrawals NUMERIC NOT NULL DEFAULT 0,
  fees NUMERIC NOT NULL DEFAULT 0,
  ending_balance NUMERIC NOT NULL DEFAULT 0,
  reported_prr NUMERIC,
  ytd_return NUMERIC,
  one_year_return NUMERIC,
  three_year_return NUMERIC,
  five_year_return NUMERIC,
  ten_year_return NUMERIC,
  fund_name TEXT,
  ticker TEXT,
  statement_path TEXT,
  notes TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retirement_statements TO authenticated;
GRANT ALL ON public.retirement_statements TO service_role;
ALTER TABLE public.retirement_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view retirement statements"
  ON public.retirement_statements FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can create retirement statements"
  ON public.retirement_statements FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update retirement statements"
  ON public.retirement_statements FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete retirement statements"
  ON public.retirement_statements FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_retirement_statements_updated_at
  BEFORE UPDATE ON public.retirement_statements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_retirement_statements_household_month ON public.retirement_statements (household_id, period_month);
CREATE UNIQUE INDEX idx_retirement_statements_account_month ON public.retirement_statements (account_id, period_month) WHERE deleted_at IS NULL;

CREATE TABLE public.retirement_fund_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  label TEXT NOT NULL,
  ticker TEXT,
  as_of_date DATE NOT NULL,
  ytd_return NUMERIC,
  one_year_return NUMERIC,
  three_year_return NUMERIC,
  five_year_return NUMERIC,
  ten_year_return NUMERIC,
  methodology_note TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retirement_fund_returns TO authenticated;
GRANT ALL ON public.retirement_fund_returns TO service_role;
ALTER TABLE public.retirement_fund_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view fund returns"
  ON public.retirement_fund_returns FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can create fund returns"
  ON public.retirement_fund_returns FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update fund returns"
  ON public.retirement_fund_returns FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete fund returns"
  ON public.retirement_fund_returns FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_retirement_fund_returns_updated_at
  BEFORE UPDATE ON public.retirement_fund_returns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_retirement_fund_returns_household ON public.retirement_fund_returns (household_id);