
-- Credit Disputes table (eOSCAR dispute tracking)
CREATE TABLE public.credit_disputes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  credit_account_id uuid REFERENCES public.credit_accounts(id) ON DELETE SET NULL,
  bureau text NOT NULL,
  dispute_reason text NOT NULL,
  metro2_violation text,
  explanation text,
  status text NOT NULL DEFAULT 'draft',
  submitted_date date,
  response_due_date date,
  response_received_date date,
  outcome text,
  outcome_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view credit disputes" ON public.credit_disputes FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert credit disputes" ON public.credit_disputes FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update credit disputes" ON public.credit_disputes FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete credit disputes" ON public.credit_disputes FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

-- Medicaid Claims table
CREATE TABLE public.medicaid_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  claim_number text,
  client_name text NOT NULL,
  service_date date NOT NULL,
  submission_date date,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'submitted',
  denial_reason text,
  payment_date date,
  payment_amount numeric,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.medicaid_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view medicaid claims" ON public.medicaid_claims FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert medicaid claims" ON public.medicaid_claims FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update medicaid claims" ON public.medicaid_claims FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete medicaid claims" ON public.medicaid_claims FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

-- Agency Financial Snapshots (monthly cash position, payroll, reserves)
CREATE TABLE public.agency_financial_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  snapshot_month date NOT NULL,
  cash_reserves numeric NOT NULL DEFAULT 0,
  biweekly_payroll numeric NOT NULL DEFAULT 0,
  monthly_operating_expenses numeric NOT NULL DEFAULT 0,
  monthly_revenue numeric NOT NULL DEFAULT 0,
  client_census integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (household_id, snapshot_month)
);

ALTER TABLE public.agency_financial_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agency snapshots" ON public.agency_financial_snapshots FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert agency snapshots" ON public.agency_financial_snapshots FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update agency snapshots" ON public.agency_financial_snapshots FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete agency snapshots" ON public.agency_financial_snapshots FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

-- Business Credit Progress (roadmap step tracking)
CREATE TABLE public.business_credit_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  step_label text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (household_id, step_key)
);

ALTER TABLE public.business_credit_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view business credit steps" ON public.business_credit_steps FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert business credit steps" ON public.business_credit_steps FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update business credit steps" ON public.business_credit_steps FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete business credit steps" ON public.business_credit_steps FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

-- Funding Scenarios (simulator saved scenarios)
CREATE TABLE public.funding_scenarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  scenario_type text NOT NULL DEFAULT 'working_capital',
  amount numeric NOT NULL DEFAULT 0,
  interest_rate numeric NOT NULL DEFAULT 0,
  term_months integer NOT NULL DEFAULT 12,
  monthly_payment numeric NOT NULL DEFAULT 0,
  parameters jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.funding_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view funding scenarios" ON public.funding_scenarios FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert funding scenarios" ON public.funding_scenarios FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update funding scenarios" ON public.funding_scenarios FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete funding scenarios" ON public.funding_scenarios FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
