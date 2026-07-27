CREATE TABLE public.spending_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'The Montgomery Money Blueprint',
  balance_sheet JSONB NOT NULL DEFAULT '{}'::jsonb,
  income JSONB NOT NULL DEFAULT '{}'::jsonb,
  buckets JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spending_plans TO authenticated;
GRANT ALL ON public.spending_plans TO service_role;

ALTER TABLE public.spending_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view spending plans" ON public.spending_plans
  FOR SELECT TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can create spending plans" ON public.spending_plans
  FOR INSERT TO authenticated WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update spending plans" ON public.spending_plans
  FOR UPDATE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete spending plans" ON public.spending_plans
  FOR DELETE TO authenticated USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_spending_plans_updated_at BEFORE UPDATE ON public.spending_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_spending_plans_household ON public.spending_plans(household_id);

ALTER TABLE public.accounts ADD COLUMN owner_tag TEXT;