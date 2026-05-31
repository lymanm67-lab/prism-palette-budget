
-- Retirement Allocation Settings (one row per household)
CREATE TABLE public.retirement_allocation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL UNIQUE,
  hsa_eligible BOOLEAN NOT NULL DEFAULT true,
  hsa_coverage TEXT NOT NULL DEFAULT 'family' CHECK (hsa_coverage IN ('self','family')),
  hsa_max_target NUMERIC NOT NULL DEFAULT 8550,
  roth_pct_default NUMERIC NOT NULL DEFAULT 60 CHECK (roth_pct_default BETWEEN 0 AND 100),
  employer_contribution_rate NUMERIC NOT NULL DEFAULT 9,
  annual_raise_pct NUMERIC NOT NULL DEFAULT 3,
  inflation_mode TEXT NOT NULL DEFAULT 'future' CHECK (inflation_mode IN ('today','future')),
  current_monthly_salary NUMERIC NOT NULL DEFAULT 5739.50,
  current_ee_contribution NUMERIC NOT NULL DEFAULT 451.66,
  current_er_contribution NUMERIC NOT NULL DEFAULT 516.56,
  ss_age70_estimate NUMERIC NOT NULL DEFAULT 3540,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retirement_allocation_settings TO authenticated;
GRANT ALL ON public.retirement_allocation_settings TO service_role;

ALTER TABLE public.retirement_allocation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view allocation settings"
  ON public.retirement_allocation_settings FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert allocation settings"
  ON public.retirement_allocation_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update allocation settings"
  ON public.retirement_allocation_settings FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete allocation settings"
  ON public.retirement_allocation_settings FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER set_retirement_allocation_settings_updated_at
  BEFORE UPDATE ON public.retirement_allocation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Retirement Allocation Events (one per future contribution change)
CREATE TABLE public.retirement_allocation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  user_id UUID,
  event_date DATE NOT NULL,
  event_label TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('step_up','raise_redirect','debt_redirect','ss_invest')),
  monthly_amount NUMERIC,
  default_allocation JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_allocation JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_retirement_allocation_events_household ON public.retirement_allocation_events(household_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_retirement_allocation_events_date ON public.retirement_allocation_events(household_id, event_date) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retirement_allocation_events TO authenticated;
GRANT ALL ON public.retirement_allocation_events TO service_role;

ALTER TABLE public.retirement_allocation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view allocation events"
  ON public.retirement_allocation_events FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert allocation events"
  ON public.retirement_allocation_events FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update allocation events"
  ON public.retirement_allocation_events FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete allocation events"
  ON public.retirement_allocation_events FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER set_retirement_allocation_events_updated_at
  BEFORE UPDATE ON public.retirement_allocation_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
