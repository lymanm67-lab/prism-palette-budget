-- SETTINGS
CREATE TABLE public.travel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  monthly_target numeric NOT NULL DEFAULT 500,
  essential_budget numeric NOT NULL DEFAULT 5000,
  target_budget numeric NOT NULL DEFAULT 6000,
  enhanced_budget numeric NOT NULL DEFAULT 7000,
  reserve_target numeric NOT NULL DEFAULT 7000,
  cycle_start_month integer NOT NULL DEFAULT 2,
  trip_month integer NOT NULL DEFAULT 1,
  inflation_pct numeric NOT NULL DEFAULT 4,
  cost_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_settings TO authenticated;
GRANT ALL ON public.travel_settings TO service_role;
ALTER TABLE public.travel_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "travel_settings_select" ON public.travel_settings FOR SELECT TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "travel_settings_insert" ON public.travel_settings FOR INSERT TO authenticated WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "travel_settings_update" ON public.travel_settings FOR UPDATE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "travel_settings_delete" ON public.travel_settings FOR DELETE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_travel_settings_updated BEFORE UPDATE ON public.travel_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TRIPS
CREATE TABLE public.travel_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  destination text NOT NULL,
  travel_month integer NOT NULL DEFAULT 1,
  travel_year integer NOT NULL,
  depart_date date,
  trip_type text NOT NULL DEFAULT 'personal',
  status text NOT NULL DEFAULT 'planning',
  budget_target numeric NOT NULL DEFAULT 6000,
  saved_amount numeric NOT NULL DEFAULT 0,
  rollover_amount numeric NOT NULL DEFAULT 0,
  monthly_contribution numeric NOT NULL DEFAULT 500,
  savings_start_date date,
  is_prepaid boolean NOT NULL DEFAULT false,
  actual_cost numeric,
  completed_at date,
  funding_checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  booking jsonb NOT NULL DEFAULT '{}'::jsonb,
  final_payment_due date,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_trips TO authenticated;
GRANT ALL ON public.travel_trips TO service_role;
ALTER TABLE public.travel_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "travel_trips_select" ON public.travel_trips FOR SELECT TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "travel_trips_insert" ON public.travel_trips FOR INSERT TO authenticated WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "travel_trips_update" ON public.travel_trips FOR UPDATE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "travel_trips_delete" ON public.travel_trips FOR DELETE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_travel_trips_updated BEFORE UPDATE ON public.travel_trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_travel_trips_household ON public.travel_trips (household_id, travel_year, travel_month);

-- BUDGET LINES
CREATE TABLE public.travel_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.travel_trips(id) ON DELETE CASCADE,
  category text NOT NULL,
  budget_amount numeric NOT NULL DEFAULT 0,
  actual_amount numeric NOT NULL DEFAULT 0,
  classification text NOT NULL DEFAULT 'personal',
  business_pct numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_budget_lines TO authenticated;
GRANT ALL ON public.travel_budget_lines TO service_role;
ALTER TABLE public.travel_budget_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "travel_budget_lines_select" ON public.travel_budget_lines FOR SELECT TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "travel_budget_lines_insert" ON public.travel_budget_lines FOR INSERT TO authenticated WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "travel_budget_lines_update" ON public.travel_budget_lines FOR UPDATE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "travel_budget_lines_delete" ON public.travel_budget_lines FOR DELETE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_travel_budget_lines_updated BEFORE UPDATE ON public.travel_budget_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_travel_budget_lines_trip ON public.travel_budget_lines (trip_id);

-- CONTRIBUTIONS
CREATE TABLE public.travel_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.travel_trips(id) ON DELETE SET NULL,
  contribution_month date NOT NULL,
  amount numeric NOT NULL DEFAULT 500,
  is_actual boolean NOT NULL DEFAULT false,
  source text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_contributions TO authenticated;
GRANT ALL ON public.travel_contributions TO service_role;
ALTER TABLE public.travel_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "travel_contributions_select" ON public.travel_contributions FOR SELECT TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "travel_contributions_insert" ON public.travel_contributions FOR INSERT TO authenticated WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "travel_contributions_update" ON public.travel_contributions FOR UPDATE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "travel_contributions_delete" ON public.travel_contributions FOR DELETE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_travel_contributions_updated BEFORE UPDATE ON public.travel_contributions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_travel_contributions_household ON public.travel_contributions (household_id, contribution_month);

-- BUSINESS EXPENSES
CREATE TABLE public.travel_business_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.travel_trips(id) ON DELETE SET NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  location text,
  business_purpose text,
  business_activity text,
  amount numeric NOT NULL DEFAULT 0,
  business_pct numeric NOT NULL DEFAULT 100,
  receipt_url text,
  documentation text,
  cpa_reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_business_expenses TO authenticated;
GRANT ALL ON public.travel_business_expenses TO service_role;
ALTER TABLE public.travel_business_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "travel_business_expenses_select" ON public.travel_business_expenses FOR SELECT TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "travel_business_expenses_insert" ON public.travel_business_expenses FOR INSERT TO authenticated WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "travel_business_expenses_update" ON public.travel_business_expenses FOR UPDATE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "travel_business_expenses_delete" ON public.travel_business_expenses FOR DELETE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_travel_business_expenses_updated BEFORE UPDATE ON public.travel_business_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_travel_business_expenses_household ON public.travel_business_expenses (household_id, expense_date);