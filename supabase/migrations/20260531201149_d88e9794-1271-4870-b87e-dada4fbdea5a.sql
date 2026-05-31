
-- AI coach sessions
CREATE TABLE public.home_buying_coach_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  user_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  report jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_buying_coach_sessions TO authenticated;
GRANT ALL ON public.home_buying_coach_sessions TO service_role;

ALTER TABLE public.home_buying_coach_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view coach sessions"
  ON public.home_buying_coach_sessions FOR SELECT
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can create coach sessions"
  ON public.home_buying_coach_sessions FOR INSERT
  WITH CHECK (public.is_household_member(auth.uid(), household_id) AND auth.uid() = user_id);

CREATE POLICY "Household members can update coach sessions"
  ON public.home_buying_coach_sessions FOR UPDATE
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can delete coach sessions"
  ON public.home_buying_coach_sessions FOR DELETE
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_home_buying_coach_sessions_updated_at
  BEFORE UPDATE ON public.home_buying_coach_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_home_buying_coach_sessions_household ON public.home_buying_coach_sessions(household_id);

-- Saved scenarios
CREATE TABLE public.home_buying_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  inputs jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_buying_scenarios TO authenticated;
GRANT ALL ON public.home_buying_scenarios TO service_role;

ALTER TABLE public.home_buying_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view scenarios"
  ON public.home_buying_scenarios FOR SELECT
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can create scenarios"
  ON public.home_buying_scenarios FOR INSERT
  WITH CHECK (public.is_household_member(auth.uid(), household_id) AND auth.uid() = user_id);

CREATE POLICY "Household members can update scenarios"
  ON public.home_buying_scenarios FOR UPDATE
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can delete scenarios"
  ON public.home_buying_scenarios FOR DELETE
  USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_home_buying_scenarios_household ON public.home_buying_scenarios(household_id);
