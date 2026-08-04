-- ============ Tiny Home Village (Goal 2) ============

CREATE TABLE public.thv_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL UNIQUE,
  mission TEXT NOT NULL DEFAULT 'The Montgomery family will create a safe and supportive tiny home community where young adults aging out of foster care can build stability, develop life skills, strengthen their finances, and prepare for independent adulthood.',
  current_phase TEXT NOT NULL DEFAULT 'Phase 1: Vision and Feasibility',
  target_location TEXT NOT NULL DEFAULT 'Summit County, Ohio',
  target_opening_date DATE,
  planned_homes INTEGER NOT NULL DEFAULT 6,
  residents_served INTEGER NOT NULL DEFAULT 6,
  est_land_cost NUMERIC NOT NULL DEFAULT 250000,
  est_construction_cost NUMERIC NOT NULL DEFAULT 900000,
  est_total_cost NUMERIC NOT NULL DEFAULT 1500000,
  funding_secured NUMERIC NOT NULL DEFAULT 0,
  funding_pending NUMERIC NOT NULL DEFAULT 0,
  community_partners INTEGER NOT NULL DEFAULT 0,
  approvals_completed INTEGER NOT NULL DEFAULT 0,
  next_milestone TEXT NOT NULL DEFAULT 'Complete preliminary feasibility study',
  risk_rating TEXT NOT NULL DEFAULT 'Moderate',
  responsible_owner TEXT NOT NULL DEFAULT 'Lyman Montgomery',
  progress JSONB NOT NULL DEFAULT '{"research":10,"partnerships":0,"site":0,"zoning":0,"funding":0,"design":0,"construction":0,"program":0,"staffing":0,"launch":0}'::jsonb,
  housing_models JSONB NOT NULL DEFAULT '[]'::jsonb,
  residency_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  allocation_mode TEXT NOT NULL DEFAULT 'percent_net_profit',
  allocation_percent NUMERIC NOT NULL DEFAULT 10,
  allocation_fixed_annual NUMERIC NOT NULL DEFAULT 0,
  allocation_sale_percent NUMERIC NOT NULL DEFAULT 0,
  allocation_refi_percent NUMERIC NOT NULL DEFAULT 0,
  mh_annual_net_profit NUMERIC NOT NULL DEFAULT 0,
  village_fund_balance NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.thv_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  phase INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  owner TEXT,
  due_date DATE,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.thv_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  name TEXT NOT NULL,
  street_address TEXT,
  city TEXT,
  county TEXT,
  parcel_number TEXT,
  asking_price NUMERIC DEFAULT 0,
  acreage NUMERIC DEFAULT 0,
  zoning_classification TEXT,
  current_use TEXT,
  homes_allowed INTEGER DEFAULT 0,
  water_access BOOLEAN NOT NULL DEFAULT false,
  sewer_access BOOLEAN NOT NULL DEFAULT false,
  electric_access BOOLEAN NOT NULL DEFAULT false,
  gas_access BOOLEAN NOT NULL DEFAULT false,
  internet_access BOOLEAN NOT NULL DEFAULT false,
  road_access TEXT,
  transit_access TEXT,
  dist_employers NUMERIC,
  dist_education NUMERIC,
  dist_grocery NUMERIC,
  dist_healthcare NUMERIC,
  dist_social_services NUMERIC,
  environmental_concerns TEXT,
  demolition_required TEXT,
  site_prep_required TEXT,
  est_infrastructure_cost NUMERIC DEFAULT 0,
  neighborhood_support TEXT,
  government_support TEXT,
  approval_status TEXT NOT NULL DEFAULT 'Not Started',
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.thv_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Small Pilot Village',
  scenario TEXT NOT NULL DEFAULT 'expected',
  homes_count INTEGER NOT NULL DEFAULT 6,
  cost_per_home NUMERIC NOT NULL DEFAULT 85000,
  contingency_pct NUMERIC NOT NULL DEFAULT 10,
  funding_secured NUMERIC NOT NULL DEFAULT 0,
  line_items JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.thv_operating_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL UNIQUE,
  homes_count INTEGER NOT NULL DEFAULT 6,
  residents_count INTEGER NOT NULL DEFAULT 6,
  expenses JSONB NOT NULL DEFAULT '{}'::jsonb,
  income JSONB NOT NULL DEFAULT '{}'::jsonb,
  reserve_months NUMERIC NOT NULL DEFAULT 6,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.thv_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner TEXT,
  partner TEXT,
  frequency TEXT,
  capacity INTEGER,
  est_cost NUMERIC DEFAULT 0,
  funding_source TEXT,
  participation_rate NUMERIC DEFAULT 0,
  completion_rate NUMERIC DEFAULT 0,
  success_measure TEXT,
  status TEXT NOT NULL DEFAULT 'Planned',
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.thv_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'Foster care agencies',
  organization TEXT NOT NULL,
  contact_person TEXT,
  role TEXT,
  email TEXT,
  phone TEXT,
  proposed_contribution TEXT,
  financial_commitment NUMERIC DEFAULT 0,
  inkind_commitment TEXT,
  volunteer_commitment TEXT,
  agreement_status TEXT,
  date_contacted DATE,
  follow_up_date DATE,
  status TEXT NOT NULL DEFAULT 'Researching',
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.thv_funding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  source TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Private donations',
  target_amount NUMERIC NOT NULL DEFAULT 0,
  requested_amount NUMERIC NOT NULL DEFAULT 0,
  committed_amount NUMERIC NOT NULL DEFAULT 0,
  received_amount NUMERIC NOT NULL DEFAULT 0,
  is_inkind BOOLEAN NOT NULL DEFAULT false,
  application_date DATE,
  application_deadline DATE,
  decision_date DATE,
  restrictions TEXT,
  reporting_requirements TEXT,
  contact_person TEXT,
  follow_up_date DATE,
  status TEXT NOT NULL DEFAULT 'Researching',
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.thv_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  risk TEXT NOT NULL,
  description TEXT,
  probability TEXT NOT NULL DEFAULT 'Moderate',
  financial_impact TEXT NOT NULL DEFAULT 'Moderate',
  program_impact TEXT NOT NULL DEFAULT 'Moderate',
  overall_rating TEXT NOT NULL DEFAULT 'Moderate',
  mitigation_plan TEXT,
  owner TEXT,
  review_date DATE,
  status TEXT NOT NULL DEFAULT 'Open',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.thv_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  year INTEGER NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.thv_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'Feasibility studies',
  tags TEXT[] NOT NULL DEFAULT '{}',
  storage_path TEXT,
  external_url TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.thv_residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  resident_code TEXT NOT NULL,
  move_in_date DATE,
  expected_exit_date DATE,
  housing_model TEXT,
  employed BOOLEAN NOT NULL DEFAULT false,
  enrolled_education BOOLEAN NOT NULL DEFAULT false,
  finished_financial_ed BOOLEAN NOT NULL DEFAULT false,
  has_bank_account BOOLEAN NOT NULL DEFAULT false,
  emergency_savings NUMERIC NOT NULL DEFAULT 0,
  credit_improved BOOLEAN NOT NULL DEFAULT false,
  reliable_transportation BOOLEAN NOT NULL DEFAULT false,
  mentor_assigned BOOLEAN NOT NULL DEFAULT false,
  readiness_score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thv_settings TO authenticated;
GRANT ALL ON public.thv_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thv_tasks TO authenticated;
GRANT ALL ON public.thv_tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thv_sites TO authenticated;
GRANT ALL ON public.thv_sites TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thv_budgets TO authenticated;
GRANT ALL ON public.thv_budgets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thv_operating_budget TO authenticated;
GRANT ALL ON public.thv_operating_budget TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thv_programs TO authenticated;
GRANT ALL ON public.thv_programs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thv_partners TO authenticated;
GRANT ALL ON public.thv_partners TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thv_funding TO authenticated;
GRANT ALL ON public.thv_funding TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thv_risks TO authenticated;
GRANT ALL ON public.thv_risks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thv_impact TO authenticated;
GRANT ALL ON public.thv_impact TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thv_documents TO authenticated;
GRANT ALL ON public.thv_documents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thv_residents TO authenticated;
GRANT ALL ON public.thv_residents TO service_role;

-- RLS
ALTER TABLE public.thv_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thv_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thv_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thv_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thv_operating_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thv_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thv_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thv_funding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thv_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thv_impact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thv_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thv_residents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "thv_settings household" ON public.thv_settings FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "thv_tasks household" ON public.thv_tasks FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "thv_sites household" ON public.thv_sites FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "thv_budgets household" ON public.thv_budgets FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "thv_operating_budget household" ON public.thv_operating_budget FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "thv_programs household" ON public.thv_programs FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "thv_partners household" ON public.thv_partners FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "thv_funding household" ON public.thv_funding FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "thv_risks household" ON public.thv_risks FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "thv_impact household" ON public.thv_impact FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "thv_documents household" ON public.thv_documents FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "thv_residents household" ON public.thv_residents FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

-- updated_at triggers
CREATE TRIGGER trg_thv_settings_updated BEFORE UPDATE ON public.thv_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_thv_tasks_updated BEFORE UPDATE ON public.thv_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_thv_sites_updated BEFORE UPDATE ON public.thv_sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_thv_budgets_updated BEFORE UPDATE ON public.thv_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_thv_operating_budget_updated BEFORE UPDATE ON public.thv_operating_budget FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_thv_programs_updated BEFORE UPDATE ON public.thv_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_thv_partners_updated BEFORE UPDATE ON public.thv_partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_thv_funding_updated BEFORE UPDATE ON public.thv_funding FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_thv_risks_updated BEFORE UPDATE ON public.thv_risks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_thv_impact_updated BEFORE UPDATE ON public.thv_impact FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_thv_documents_updated BEFORE UPDATE ON public.thv_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_thv_residents_updated BEFORE UPDATE ON public.thv_residents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_thv_tasks_hh ON public.thv_tasks(household_id, phase);
CREATE INDEX idx_thv_sites_hh ON public.thv_sites(household_id);
CREATE INDEX idx_thv_partners_hh ON public.thv_partners(household_id);
CREATE INDEX idx_thv_funding_hh ON public.thv_funding(household_id);
CREATE INDEX idx_thv_risks_hh ON public.thv_risks(household_id);
CREATE INDEX idx_thv_documents_hh ON public.thv_documents(household_id);
CREATE INDEX idx_thv_residents_hh ON public.thv_residents(household_id);
CREATE UNIQUE INDEX idx_thv_impact_year ON public.thv_impact(household_id, year);