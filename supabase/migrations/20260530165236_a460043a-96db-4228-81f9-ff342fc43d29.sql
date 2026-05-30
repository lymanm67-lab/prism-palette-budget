-- Investment Planning module tables (v1)

CREATE TABLE public.investment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Investment Plan',
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Core inputs
  current_age INTEGER,
  retirement_age INTEGER,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  target_amount NUMERIC NOT NULL DEFAULT 0,

  monthly_employee_contribution NUMERIC NOT NULL DEFAULT 0,
  monthly_employer_contribution NUMERIC NOT NULL DEFAULT 0,
  employer_match_pct NUMERIC,

  expected_return_pct NUMERIC NOT NULL DEFAULT 7,
  annual_raise_pct NUMERIC NOT NULL DEFAULT 3,
  raise_redirect_pct NUMERIC NOT NULL DEFAULT 100,

  current_monthly_income NUMERIC,

  -- Debt redirect
  debt_payment_amount NUMERIC,
  debt_payoff_date DATE,

  -- Additional planned contribution
  additional_monthly_amount NUMERIC,
  additional_start_date DATE,

  -- Social Security
  ss_monthly_estimate NUMERIC,
  ss_claiming_age INTEGER,
  ss_invest_while_working BOOLEAN NOT NULL DEFAULT false,
  ss_invest_pct NUMERIC NOT NULL DEFAULT 0,

  -- HSA
  hsa_balance NUMERIC NOT NULL DEFAULT 0,
  hsa_monthly_contribution NUMERIC NOT NULL DEFAULT 0,
  hsa_employer_contribution NUMERIC NOT NULL DEFAULT 0,
  hsa_invested BOOLEAN NOT NULL DEFAULT false,
  hsa_return_pct NUMERIC NOT NULL DEFAULT 6,

  -- Display
  use_future_dollars BOOLEAN NOT NULL DEFAULT true,
  inflation_pct NUMERIC NOT NULL DEFAULT 2.5,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_plans TO authenticated;
GRANT ALL ON public.investment_plans TO service_role;
ALTER TABLE public.investment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view investment plans" ON public.investment_plans
  FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert investment plans" ON public.investment_plans
  FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update investment plans" ON public.investment_plans
  FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete investment plans" ON public.investment_plans
  FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

CREATE TRIGGER trg_investment_plans_updated_at
  BEFORE UPDATE ON public.investment_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_investment_plans_household ON public.investment_plans(household_id);

-- Scenarios
CREATE TABLE public.investment_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  plan_id UUID,
  name TEXT NOT NULL,
  scenario_type TEXT NOT NULL DEFAULT 'custom', -- conservative|moderate|growth|custom
  return_pct NUMERIC NOT NULL DEFAULT 7,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_scenarios TO authenticated;
GRANT ALL ON public.investment_scenarios TO service_role;
ALTER TABLE public.investment_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view scenarios" ON public.investment_scenarios
  FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert scenarios" ON public.investment_scenarios
  FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update scenarios" ON public.investment_scenarios
  FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete scenarios" ON public.investment_scenarios
  FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

CREATE INDEX idx_investment_scenarios_household ON public.investment_scenarios(household_id);

-- Milestones (review checklist)
CREATE TABLE public.investment_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  age INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_milestones TO authenticated;
GRANT ALL ON public.investment_milestones TO service_role;
ALTER TABLE public.investment_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view milestones" ON public.investment_milestones
  FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert milestones" ON public.investment_milestones
  FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update milestones" ON public.investment_milestones
  FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete milestones" ON public.investment_milestones
  FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

CREATE TRIGGER trg_investment_milestones_updated_at
  BEFORE UPDATE ON public.investment_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_investment_milestones_household ON public.investment_milestones(household_id);