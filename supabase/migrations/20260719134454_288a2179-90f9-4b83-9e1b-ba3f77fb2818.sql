
-- 1. Extend credit_disputes with escalation fields
ALTER TABLE public.credit_disputes
  ADD COLUMN IF NOT EXISTS round INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS escalation_channel TEXT NOT NULL DEFAULT 'bureau',
  ADD COLUMN IF NOT EXISTS next_action_date DATE,
  ADD COLUMN IF NOT EXISTS next_action_type TEXT,
  ADD COLUMN IF NOT EXISTS parent_dispute_id UUID REFERENCES public.credit_disputes(id) ON DELETE SET NULL;

-- 2. Escalation log
CREATE TABLE IF NOT EXISTS public.dispute_escalation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  dispute_id UUID NOT NULL REFERENCES public.credit_disputes(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  action TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'bureau',
  sent_date DATE,
  response_date DATE,
  outcome TEXT,
  notes TEXT,
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispute_escalation_log TO authenticated;
GRANT ALL ON public.dispute_escalation_log TO service_role;

ALTER TABLE public.dispute_escalation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view escalation log"
  ON public.dispute_escalation_log FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can insert escalation log"
  ON public.dispute_escalation_log FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update escalation log"
  ON public.dispute_escalation_log FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete escalation log"
  ON public.dispute_escalation_log FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER dispute_escalation_log_updated_at
  BEFORE UPDATE ON public.dispute_escalation_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Credit inquiries
CREATE TABLE IF NOT EXISTS public.credit_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  bureau TEXT NOT NULL,
  inquiry_date DATE NOT NULL,
  creditor_name TEXT NOT NULL,
  inquiry_type TEXT NOT NULL DEFAULT 'hard',
  is_authorized BOOLEAN,
  dispute_status TEXT NOT NULL DEFAULT 'none',
  dispute_submitted_date DATE,
  dispute_outcome TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_inquiries TO authenticated;
GRANT ALL ON public.credit_inquiries TO service_role;

ALTER TABLE public.credit_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view inquiries"
  ON public.credit_inquiries FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can insert inquiries"
  ON public.credit_inquiries FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update inquiries"
  ON public.credit_inquiries FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete inquiries"
  ON public.credit_inquiries FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER credit_inquiries_updated_at
  BEFORE UPDATE ON public.credit_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_credit_inquiries_household ON public.credit_inquiries(household_id);
CREATE INDEX IF NOT EXISTS idx_escalation_log_dispute ON public.dispute_escalation_log(dispute_id);
