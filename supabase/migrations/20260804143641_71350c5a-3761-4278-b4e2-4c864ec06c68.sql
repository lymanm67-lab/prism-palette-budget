-- =========================
-- Medical Housing Planner
-- =========================

CREATE TABLE public.mh_markets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT,
  zip TEXT,
  region TEXT NOT NULL DEFAULT 'akron',
  priority TEXT NOT NULL DEFAULT 'secondary',
  classification TEXT[] NOT NULL DEFAULT '{}',
  cautions TEXT[] NOT NULL DEFAULT '{}',
  price_low NUMERIC NOT NULL DEFAULT 0,
  price_high NUMERIC NOT NULL DEFAULT 0,
  rent_low NUMERIC,
  rent_expected NUMERIC,
  rent_strong NUMERIC,
  recommendation TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mh_markets TO authenticated;
GRANT ALL ON public.mh_markets TO service_role;
ALTER TABLE public.mh_markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mh_markets_household" ON public.mh_markets FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_mh_markets_updated BEFORE UPDATE ON public.mh_markets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.mh_employers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  address TEXT,
  city TEXT,
  employee_count INTEGER,
  has_residency BOOLEAN NOT NULL DEFAULT false,
  has_fellowship BOOLEAN NOT NULL DEFAULT false,
  med_school_affiliation TEXT,
  travel_nurse_demand TEXT NOT NULL DEFAULT 'unknown',
  contract_demand TEXT NOT NULL DEFAULT 'unknown',
  estimated_housing_demand TEXT NOT NULL DEFAULT 'unknown',
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  referral_status TEXT NOT NULL DEFAULT 'not_contacted',
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mh_employers TO authenticated;
GRANT ALL ON public.mh_employers TO service_role;
ALTER TABLE public.mh_employers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mh_employers_household" ON public.mh_employers FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_mh_employers_updated BEFORE UPDATE ON public.mh_employers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.mh_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  market_id UUID REFERENCES public.mh_markets(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  address TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'reviewing',
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  bedrooms NUMERIC NOT NULL DEFAULT 3,
  bathrooms NUMERIC NOT NULL DEFAULT 1.5,
  off_street_parking BOOLEAN NOT NULL DEFAULT false,
  laundry BOOLEAN NOT NULL DEFAULT false,
  minutes_to_hospital NUMERIC,
  furnished_rent NUMERIC NOT NULL DEFAULT 0,
  longterm_rent NUMERIC NOT NULL DEFAULT 0,
  hoa_restrictions BOOLEAN NOT NULL DEFAULT false,
  compliance_verified BOOLEAN NOT NULL DEFAULT false,
  major_repairs_unresolved BOOLEAN NOT NULL DEFAULT false,
  reserves_available NUMERIC NOT NULL DEFAULT 0,
  condition_notes TEXT,
  notes TEXT,
  score_hospital_proximity INTEGER,
  score_neighborhood INTEGER,
  score_purchase_price INTEGER,
  score_furnished_rent INTEGER,
  score_longterm_rent INTEGER,
  score_parking INTEGER,
  score_condition INTEGER,
  score_laundry INTEGER,
  score_bedrooms INTEGER,
  score_safety INTEGER,
  score_management INTEGER,
  score_resale INTEGER,
  score_cash_flow INTEGER,
  score_reserves INTEGER,
  score_overall_risk INTEGER,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mh_properties TO authenticated;
GRANT ALL ON public.mh_properties TO service_role;
ALTER TABLE public.mh_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mh_properties_household" ON public.mh_properties FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_mh_properties_updated BEFORE UPDATE ON public.mh_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.mh_startup_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  purchase_price NUMERIC NOT NULL DEFAULT 150000,
  down_payment_pct NUMERIC NOT NULL DEFAULT 20,
  closing_costs NUMERIC NOT NULL DEFAULT 0,
  inspection_cost NUMERIC NOT NULL DEFAULT 0,
  appraisal_cost NUMERIC NOT NULL DEFAULT 0,
  initial_repairs NUMERIC NOT NULL DEFAULT 0,
  paint_cosmetic NUMERIC NOT NULL DEFAULT 0,
  furniture NUMERIC NOT NULL DEFAULT 0,
  appliances NUMERIC NOT NULL DEFAULT 0,
  kitchen_supplies NUMERIC NOT NULL DEFAULT 0,
  linens NUMERIC NOT NULL DEFAULT 0,
  security_system NUMERIC NOT NULL DEFAULT 0,
  internet_setup NUMERIC NOT NULL DEFAULT 0,
  utility_deposits NUMERIC NOT NULL DEFAULT 0,
  insurance_deposit NUMERIC NOT NULL DEFAULT 0,
  licensing_permits NUMERIC NOT NULL DEFAULT 0,
  marketing NUMERIC NOT NULL DEFAULT 0,
  initial_cleaning NUMERIC NOT NULL DEFAULT 0,
  vacancy_reserve NUMERIC NOT NULL DEFAULT 0,
  maintenance_reserve NUMERIC NOT NULL DEFAULT 0,
  emergency_reserve NUMERIC NOT NULL DEFAULT 0,
  range_low NUMERIC,
  range_high NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mh_startup_scenarios TO authenticated;
GRANT ALL ON public.mh_startup_scenarios TO service_role;
ALTER TABLE public.mh_startup_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mh_startup_household" ON public.mh_startup_scenarios FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_mh_startup_updated BEFORE UPDATE ON public.mh_startup_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.mh_income_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model_type TEXT NOT NULL DEFAULT 'whole_property',
  market_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  monthly_rent NUMERIC NOT NULL DEFAULT 0,
  bedrooms NUMERIC NOT NULL DEFAULT 3,
  rent_per_room NUMERIC NOT NULL DEFAULT 0,
  occupancy_pct NUMERIC NOT NULL DEFAULT 90,
  annual_vacancy_pct NUMERIC NOT NULL DEFAULT 10,
  utilities NUMERIC NOT NULL DEFAULT 0,
  internet NUMERIC NOT NULL DEFAULT 0,
  property_taxes NUMERIC NOT NULL DEFAULT 0,
  insurance NUMERIC NOT NULL DEFAULT 0,
  mortgage NUMERIC NOT NULL DEFAULT 0,
  maintenance_reserve NUMERIC NOT NULL DEFAULT 0,
  furniture_reserve NUMERIC NOT NULL DEFAULT 0,
  cleaning NUMERIC NOT NULL DEFAULT 0,
  lawn_care NUMERIC NOT NULL DEFAULT 0,
  snow_removal NUMERIC NOT NULL DEFAULT 0,
  property_management NUMERIC NOT NULL DEFAULT 0,
  platform_fees NUMERIC NOT NULL DEFAULT 0,
  advertising NUMERIC NOT NULL DEFAULT 0,
  other_expenses NUMERIC NOT NULL DEFAULT 0,
  cash_invested NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mh_income_scenarios TO authenticated;
GRANT ALL ON public.mh_income_scenarios TO service_role;
ALTER TABLE public.mh_income_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mh_income_household" ON public.mh_income_scenarios FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_mh_income_updated BEFORE UPDATE ON public.mh_income_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.mh_duplex_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  unit_label TEXT NOT NULL,
  lease_type TEXT NOT NULL DEFAULT 'furnished_medical',
  monthly_rent NUMERIC NOT NULL DEFAULT 0,
  occupancy_pct NUMERIC NOT NULL DEFAULT 90,
  monthly_expenses NUMERIC NOT NULL DEFAULT 0,
  maintenance_cost NUMERIC NOT NULL DEFAULT 0,
  tenant_type TEXT,
  lease_expiration DATE,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mh_duplex_units TO authenticated;
GRANT ALL ON public.mh_duplex_units TO service_role;
ALTER TABLE public.mh_duplex_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mh_duplex_household" ON public.mh_duplex_units FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_mh_duplex_updated BEFORE UPDATE ON public.mh_duplex_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.mh_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  phase TEXT,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  target_date DATE,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mh_milestones TO authenticated;
GRANT ALL ON public.mh_milestones TO service_role;
ALTER TABLE public.mh_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mh_milestones_household" ON public.mh_milestones FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_mh_milestones_updated BEFORE UPDATE ON public.mh_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.mh_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE UNIQUE,
  available_reserves NUMERIC NOT NULL DEFAULT 0,
  target_startup_low NUMERIC NOT NULL DEFAULT 65000,
  target_startup_high NUMERIC NOT NULL DEFAULT 80000,
  forecast_avg_value NUMERIC NOT NULL DEFAULT 155000,
  forecast_avg_rent NUMERIC NOT NULL DEFAULT 2100,
  forecast_avg_occupancy NUMERIC NOT NULL DEFAULT 90,
  forecast_avg_cash_flow NUMERIC NOT NULL DEFAULT 250,
  forecast_appreciation_pct NUMERIC NOT NULL DEFAULT 3,
  forecast_ltv_pct NUMERIC NOT NULL DEFAULT 80,
  forecast_reserve_per_property NUMERIC NOT NULL DEFAULT 10000,
  village_allocation_pct NUMERIC NOT NULL DEFAULT 10,
  village_custom_amount NUMERIC,
  village_fund_balance NUMERIC NOT NULL DEFAULT 0,
  village_funding_goal NUMERIC NOT NULL DEFAULT 500000,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mh_settings TO authenticated;
GRANT ALL ON public.mh_settings TO service_role;
ALTER TABLE public.mh_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mh_settings_household" ON public.mh_settings FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_mh_settings_updated BEFORE UPDATE ON public.mh_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mh_markets_hh ON public.mh_markets(household_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_mh_employers_hh ON public.mh_employers(household_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_mh_properties_hh ON public.mh_properties(household_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_mh_startup_hh ON public.mh_startup_scenarios(household_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_mh_income_hh ON public.mh_income_scenarios(household_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_mh_duplex_hh ON public.mh_duplex_units(household_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_mh_milestones_hh ON public.mh_milestones(household_id) WHERE deleted_at IS NULL;