
-- Spouse / household partner block (1:1 with plan)
CREATE TABLE public.investment_plan_spouse (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.investment_plans(id) ON DELETE CASCADE UNIQUE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT,
  current_age INTEGER,
  retirement_age INTEGER,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  monthly_employee_contribution NUMERIC NOT NULL DEFAULT 0,
  monthly_employer_contribution NUMERIC NOT NULL DEFAULT 0,
  expected_return_pct NUMERIC NOT NULL DEFAULT 7,
  ss_monthly_estimate NUMERIC,
  ss_claiming_age INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_plan_spouse TO authenticated;
GRANT ALL ON public.investment_plan_spouse TO service_role;
ALTER TABLE public.investment_plan_spouse ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage spouse" ON public.investment_plan_spouse
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_spouse_updated BEFORE UPDATE ON public.investment_plan_spouse
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pensions (N per plan)
CREATE TABLE public.investment_pensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.investment_plans(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  owner TEXT NOT NULL DEFAULT 'self',
  monthly_amount NUMERIC NOT NULL DEFAULT 0,
  start_age INTEGER,
  cola_pct NUMERIC NOT NULL DEFAULT 0,
  survivor_pct NUMERIC NOT NULL DEFAULT 0,
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  use_mode TEXT NOT NULL DEFAULT 'income',
  lump_sum_amount NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_pensions TO authenticated;
GRANT ALL ON public.investment_pensions TO service_role;
ALTER TABLE public.investment_pensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage pensions" ON public.investment_pensions
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_pensions_updated BEFORE UPDATE ON public.investment_pensions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Legacy goals (1:1 with plan typically, but allow many)
CREATE TABLE public.investment_legacy_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.investment_plans(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Legacy Goal',
  target_amount NUMERIC NOT NULL DEFAULT 0,
  target_year INTEGER,
  included_account_ids UUID[] NOT NULL DEFAULT '{}',
  excluded_account_ids UUID[] NOT NULL DEFAULT '{}',
  beneficiaries JSONB NOT NULL DEFAULT '[]'::jsonb,
  advisors JSONB NOT NULL DEFAULT '[]'::jsonb,
  has_will BOOLEAN NOT NULL DEFAULT false,
  has_trust BOOLEAN NOT NULL DEFAULT false,
  has_poa BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_legacy_goals TO authenticated;
GRANT ALL ON public.investment_legacy_goals TO service_role;
ALTER TABLE public.investment_legacy_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage legacy" ON public.investment_legacy_goals
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_legacy_updated BEFORE UPDATE ON public.investment_legacy_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Money rules (automations)
CREATE TABLE public.investment_money_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.investment_plans(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'date',
  start_date DATE,
  amount NUMERIC,
  amount_pct NUMERIC,
  destination TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  reminder BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_money_rules TO authenticated;
GRANT ALL ON public.investment_money_rules TO service_role;
ALTER TABLE public.investment_money_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage money rules" ON public.investment_money_rules
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_money_rules_updated BEFORE UPDATE ON public.investment_money_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_inv_pensions_plan ON public.investment_pensions(plan_id);
CREATE INDEX idx_inv_legacy_plan ON public.investment_legacy_goals(plan_id);
CREATE INDEX idx_inv_money_rules_household ON public.investment_money_rules(household_id);
