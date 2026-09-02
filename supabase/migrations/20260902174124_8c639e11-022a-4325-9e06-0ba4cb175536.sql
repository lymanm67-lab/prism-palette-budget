CREATE TABLE public.stress_test_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  name TEXT NOT NULL,
  slot TEXT NOT NULL DEFAULT 'base',
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  goals JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB,
  runs INTEGER NOT NULL DEFAULT 10000,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stress_test_scenarios TO authenticated;
GRANT ALL ON public.stress_test_scenarios TO service_role;
ALTER TABLE public.stress_test_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view stress scenarios" ON public.stress_test_scenarios
  FOR SELECT TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can create stress scenarios" ON public.stress_test_scenarios
  FOR INSERT TO authenticated WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update stress scenarios" ON public.stress_test_scenarios
  FOR UPDATE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete stress scenarios" ON public.stress_test_scenarios
  FOR DELETE TO authenticated USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_stress_scenarios_household ON public.stress_test_scenarios (household_id) WHERE deleted_at IS NULL;

CREATE TABLE public.stress_test_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  portfolio_balance NUMERIC NOT NULL DEFAULT 0,
  monthly_contribution NUMERIC NOT NULL DEFAULT 0,
  success_probability NUMERIC NOT NULL DEFAULT 0,
  legacy_probability NUMERIC NOT NULL DEFAULT 0,
  depletion_probability NUMERIC NOT NULL DEFAULT 0,
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stress_test_snapshots TO authenticated;
GRANT ALL ON public.stress_test_snapshots TO service_role;
ALTER TABLE public.stress_test_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view stress snapshots" ON public.stress_test_snapshots
  FOR SELECT TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can create stress snapshots" ON public.stress_test_snapshots
  FOR INSERT TO authenticated WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update stress snapshots" ON public.stress_test_snapshots
  FOR UPDATE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete stress snapshots" ON public.stress_test_snapshots
  FOR DELETE TO authenticated USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_stress_snapshots_household ON public.stress_test_snapshots (household_id, snapshot_date) WHERE deleted_at IS NULL;

CREATE TRIGGER update_stress_scenarios_updated_at BEFORE UPDATE ON public.stress_test_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();