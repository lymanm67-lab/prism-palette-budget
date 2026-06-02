CREATE TABLE public.paycheck_deployment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL UNIQUE,
  fixed_min numeric NOT NULL DEFAULT 50,
  fixed_max numeric NOT NULL DEFAULT 60,
  fixed_target numeric NOT NULL DEFAULT 60,
  invest_min numeric NOT NULL DEFAULT 5,
  invest_max numeric NOT NULL DEFAULT 10,
  invest_target numeric NOT NULL DEFAULT 10,
  savings_min numeric NOT NULL DEFAULT 5,
  savings_max numeric NOT NULL DEFAULT 10,
  savings_target numeric NOT NULL DEFAULT 10,
  guiltfree_min numeric NOT NULL DEFAULT 20,
  guiltfree_max numeric NOT NULL DEFAULT 35,
  guiltfree_target numeric NOT NULL DEFAULT 20,
  nag_enabled boolean NOT NULL DEFAULT true,
  nag_hours integer NOT NULL DEFAULT 24,
  savings_account_id uuid,
  investment_account_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paycheck_deployment_rules TO authenticated;
GRANT ALL ON public.paycheck_deployment_rules TO service_role;

ALTER TABLE public.paycheck_deployment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members read deployment rules"
  ON public.paycheck_deployment_rules FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "household members insert deployment rules"
  ON public.paycheck_deployment_rules FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "household members update deployment rules"
  ON public.paycheck_deployment_rules FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "household members delete deployment rules"
  ON public.paycheck_deployment_rules FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_paycheck_deployment_rules_updated_at
  BEFORE UPDATE ON public.paycheck_deployment_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();