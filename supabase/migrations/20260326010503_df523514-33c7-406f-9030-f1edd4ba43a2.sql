
-- Table to store audit results
CREATE TABLE public.reconciliation_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  audit_month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (household_id, audit_month, trigger_type)
);

ALTER TABLE public.reconciliation_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view audits" ON public.reconciliation_audits
  FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert audits" ON public.reconciliation_audits
  FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can update audits" ON public.reconciliation_audits
  FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete audits" ON public.reconciliation_audits
  FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
