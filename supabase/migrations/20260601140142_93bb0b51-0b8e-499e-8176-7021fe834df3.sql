CREATE TABLE public.recovery_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name TEXT,
  month DATE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('fast','balanced','system','wealth')),
  target_amount NUMERIC NOT NULL DEFAULT 0,
  overage_amount NUMERIC NOT NULL DEFAULT 0,
  pattern_type TEXT CHECK (pattern_type IN ('outlier','developing','repeated')),
  title TEXT NOT NULL,
  summary TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  prevention_rule TEXT,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested','active','completed','dismissed')),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recovery_plans TO authenticated;
GRANT ALL ON public.recovery_plans TO service_role;

ALTER TABLE public.recovery_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household recovery plans"
ON public.recovery_plans FOR SELECT TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can create household recovery plans"
ON public.recovery_plans FOR INSERT TO authenticated
WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can update household recovery plans"
ON public.recovery_plans FOR UPDATE TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete household recovery plans"
ON public.recovery_plans FOR DELETE TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_recovery_plans_household_month ON public.recovery_plans(household_id, month DESC);
CREATE INDEX idx_recovery_plans_status ON public.recovery_plans(household_id, status) WHERE status IN ('suggested','active');

CREATE TRIGGER update_recovery_plans_updated_at
BEFORE UPDATE ON public.recovery_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();