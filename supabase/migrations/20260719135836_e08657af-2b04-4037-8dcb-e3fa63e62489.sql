
-- Certified mail tracking on disputes
ALTER TABLE public.credit_disputes
  ADD COLUMN IF NOT EXISTS certified_tracking_number text,
  ADD COLUMN IF NOT EXISTS certified_mailed_date date,
  ADD COLUMN IF NOT EXISTS certified_delivered_date date,
  ADD COLUMN IF NOT EXISTS certified_carrier text DEFAULT 'USPS',
  ADD COLUMN IF NOT EXISTS certified_cost numeric,
  ADD COLUMN IF NOT EXISTS certified_notes text;

-- Re-aging detection
ALTER TABLE public.credit_accounts
  ADD COLUMN IF NOT EXISTS reported_first_delinquency date,
  ADD COLUMN IF NOT EXISTS reaging_suspected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reaging_notes text;

-- Debt validation tracker
CREATE TABLE IF NOT EXISTS public.debt_validation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  credit_account_id uuid REFERENCES public.credit_accounts(id) ON DELETE SET NULL,
  collector_name text NOT NULL,
  original_creditor text,
  account_reference text,
  amount_claimed numeric,
  first_contact_date date,
  dv_letter_sent_date date,
  dv_response_deadline date,
  response_received_date date,
  response_type text,
  validated boolean DEFAULT false,
  statute_of_limitations_date date,
  sol_state text,
  sol_years integer,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_validation_requests TO authenticated;
GRANT ALL ON public.debt_validation_requests TO service_role;
ALTER TABLE public.debt_validation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hh members view dv" ON public.debt_validation_requests FOR SELECT
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hh members insert dv" ON public.debt_validation_requests FOR INSERT
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hh members update dv" ON public.debt_validation_requests FOR UPDATE
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hh members delete dv" ON public.debt_validation_requests FOR DELETE
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER trg_dv_updated_at BEFORE UPDATE ON public.debt_validation_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CFPB complaint filings
CREATE TABLE IF NOT EXISTS public.cfpb_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  related_dispute_id uuid REFERENCES public.credit_disputes(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  product text NOT NULL,
  issue text NOT NULL,
  narrative text NOT NULL,
  desired_resolution text,
  cfpb_case_number text,
  submitted_date date,
  status text NOT NULL DEFAULT 'draft',
  company_response text,
  company_response_date date,
  consumer_disputed_response boolean DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cfpb_complaints TO authenticated;
GRANT ALL ON public.cfpb_complaints TO service_role;
ALTER TABLE public.cfpb_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hh members view cfpb" ON public.cfpb_complaints FOR SELECT
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hh members insert cfpb" ON public.cfpb_complaints FOR INSERT
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hh members update cfpb" ON public.cfpb_complaints FOR UPDATE
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hh members delete cfpb" ON public.cfpb_complaints FOR DELETE
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER trg_cfpb_updated_at BEFORE UPDATE ON public.cfpb_complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
