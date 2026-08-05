-- Grant & scholarship lifecycle
CREATE TABLE public.fdn_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  pillar_id uuid REFERENCES public.fdn_pillars(id) ON DELETE SET NULL,
  grant_type text NOT NULL DEFAULT 'grant',
  grantee_name text NOT NULL,
  contact_name text,
  contact_email text,
  ein text,
  project_title text,
  purpose text,
  charitable_purpose text,
  amount_requested numeric NOT NULL DEFAULT 0,
  amount_awarded numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'application',
  application_date date,
  decision_date date,
  agreement_signed_at date,
  payment_schedule text,
  report_due_date date,
  report_received_at date,
  final_report_received_at date,
  irs_status_verified boolean NOT NULL DEFAULT false,
  conflict_screened boolean NOT NULL DEFAULT false,
  due_diligence_notes text,
  selection_criteria text,
  board_approved_at date,
  expenditure_responsibility boolean NOT NULL DEFAULT false,
  outcome_summary text,
  people_served integer NOT NULL DEFAULT 0,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_grants TO authenticated;
GRANT ALL ON public.fdn_grants TO service_role;
ALTER TABLE public.fdn_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage foundation grants"
  ON public.fdn_grants FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_fdn_grants_updated BEFORE UPDATE ON public.fdn_grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insurance register
CREATE TABLE public.fdn_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  coverage_type text NOT NULL,
  carrier text,
  policy_number text,
  coverage_limit numeric NOT NULL DEFAULT 0,
  deductible numeric NOT NULL DEFAULT 0,
  annual_premium numeric NOT NULL DEFAULT 0,
  effective_date date,
  expires_at date,
  status text NOT NULL DEFAULT 'planned',
  broker text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_insurance TO authenticated;
GRANT ALL ON public.fdn_insurance TO service_role;
ALTER TABLE public.fdn_insurance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage foundation insurance"
  ON public.fdn_insurance FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_fdn_insurance_updated BEFORE UPDATE ON public.fdn_insurance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Peer foundation benchmarks
CREATE TABLE public.fdn_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  peer_name text NOT NULL,
  peer_type text NOT NULL DEFAULT 'family_foundation',
  location text,
  fiscal_year integer,
  total_assets numeric NOT NULL DEFAULT 0,
  annual_giving numeric NOT NULL DEFAULT 0,
  operating_expenses numeric NOT NULL DEFAULT 0,
  staff_count numeric NOT NULL DEFAULT 0,
  grants_count integer NOT NULL DEFAULT 0,
  payout_pct numeric NOT NULL DEFAULT 0,
  source text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_benchmarks TO authenticated;
GRANT ALL ON public.fdn_benchmarks TO service_role;
ALTER TABLE public.fdn_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage foundation benchmarks"
  ON public.fdn_benchmarks FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_fdn_benchmarks_updated BEFORE UPDATE ON public.fdn_benchmarks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Distribution / spending policy inputs
ALTER TABLE public.fdn_settings
  ADD COLUMN IF NOT EXISTS spending_policy_pct numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS mrd_avg_assets numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mrd_carryover numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mrd_qualifying_admin numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_expense_annual numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fundraising_expense_annual numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS staff_count numeric NOT NULL DEFAULT 0;