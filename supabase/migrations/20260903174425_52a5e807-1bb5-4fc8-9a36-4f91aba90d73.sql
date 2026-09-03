ALTER TABLE public.freed_cash_sources
  ADD COLUMN IF NOT EXISTS verification_method TEXT,
  ADD COLUMN IF NOT EXISTS verification_evidence TEXT,
  ADD COLUMN IF NOT EXISTS statement_checked_date DATE,
  ADD COLUMN IF NOT EXISTS next_renewal_date DATE,
  ADD COLUMN IF NOT EXISTS renewal_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS reactivation_risk TEXT NOT NULL DEFAULT 'low';

CREATE TABLE public.freed_cash_gate_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  name TEXT NOT NULL,
  vendor TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  billing_frequency TEXT NOT NULL DEFAULT 'monthly',
  entity_scope TEXT NOT NULL DEFAULT 'personal',
  reason TEXT,
  expected_value TEXT,
  replaces_source_id UUID,
  replaces_note TEXT,
  decision TEXT NOT NULL DEFAULT 'pending',
  decision_date DATE,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.freed_cash_gate_requests TO authenticated;
GRANT ALL ON public.freed_cash_gate_requests TO service_role;

ALTER TABLE public.freed_cash_gate_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view gate requests"
ON public.freed_cash_gate_requests FOR SELECT TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can insert gate requests"
ON public.freed_cash_gate_requests FOR INSERT TO authenticated
WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can update gate requests"
ON public.freed_cash_gate_requests FOR UPDATE TO authenticated
USING (public.is_household_member(auth.uid(), household_id))
WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can delete gate requests"
ON public.freed_cash_gate_requests FOR DELETE TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_freed_cash_gate_household ON public.freed_cash_gate_requests (household_id, created_at DESC);

CREATE TRIGGER update_freed_cash_gate_requests_updated_at
BEFORE UPDATE ON public.freed_cash_gate_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();