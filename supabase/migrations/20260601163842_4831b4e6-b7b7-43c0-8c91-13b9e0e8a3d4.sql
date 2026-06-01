CREATE TABLE public.coach_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  current_step int NOT NULL DEFAULT 1,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_plan jsonb,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_plans TO authenticated;
GRANT ALL ON public.coach_plans TO service_role;

ALTER TABLE public.coach_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view coach plans"
  ON public.coach_plans FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can insert coach plans"
  ON public.coach_plans FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id) AND user_id = auth.uid());

CREATE POLICY "Household members can update coach plans"
  ON public.coach_plans FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can delete coach plans"
  ON public.coach_plans FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER coach_plans_updated_at
  BEFORE UPDATE ON public.coach_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_coach_plans_household ON public.coach_plans(household_id, created_at DESC);