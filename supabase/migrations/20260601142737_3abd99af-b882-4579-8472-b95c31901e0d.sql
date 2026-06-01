
CREATE TABLE public.paycheck_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  pay_date DATE NOT NULL,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'biweekly',
  -- allocation buckets (dollars)
  bills_amount NUMERIC NOT NULL DEFAULT 0,
  min_debt_amount NUMERIC NOT NULL DEFAULT 0,
  extra_debt_amount NUMERIC NOT NULL DEFAULT 0,
  savings_amount NUMERIC NOT NULL DEFAULT 0,
  investment_amount NUMERIC NOT NULL DEFAULT 0,
  buffer_amount NUMERIC NOT NULL DEFAULT 0,
  safe_to_spend_amount NUMERIC NOT NULL DEFAULT 0,
  -- detail
  bills_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  rationale TEXT,
  confidence TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'suggested',  -- suggested|active|applied|skipped
  source TEXT NOT NULL DEFAULT 'ai',          -- ai|manual
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paycheck_deployments TO authenticated;
GRANT ALL ON public.paycheck_deployments TO service_role;

ALTER TABLE public.paycheck_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view paycheck deployments"
  ON public.paycheck_deployments FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert paycheck deployments"
  ON public.paycheck_deployments FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update paycheck deployments"
  ON public.paycheck_deployments FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete paycheck deployments"
  ON public.paycheck_deployments FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_paycheck_deployments_household_date
  ON public.paycheck_deployments(household_id, pay_date DESC);

CREATE TRIGGER update_paycheck_deployments_updated_at
  BEFORE UPDATE ON public.paycheck_deployments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
