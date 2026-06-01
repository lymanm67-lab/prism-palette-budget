CREATE TABLE public.purchase_guard_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  merchant TEXT,
  purpose TEXT,
  classification TEXT CHECK (classification IN ('need','want','strategic')),
  fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),
  fit_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  fomo_detected BOOLEAN NOT NULL DEFAULT false,
  fomo_signals TEXT[] NOT NULL DEFAULT '{}',
  wait_required_hours INTEGER NOT NULL DEFAULT 0,
  wait_until TIMESTAMPTZ,
  decision TEXT CHECK (decision IN ('pending','approved','waiting','skipped','overridden','planned')),
  override_reason TEXT,
  swap_subscription_id UUID,
  planned_target_date DATE,
  planned_goal_id UUID,
  strategic_proof JSONB,
  post_review_due_at TIMESTAMPTZ,
  post_review_completed_at TIMESTAMPTZ,
  post_review_worth_it BOOLEAN,
  post_review_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_guard_checks TO authenticated;
GRANT ALL ON public.purchase_guard_checks TO service_role;

ALTER TABLE public.purchase_guard_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household purchase guard checks"
ON public.purchase_guard_checks FOR SELECT TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can create household purchase guard checks"
ON public.purchase_guard_checks FOR INSERT TO authenticated
WITH CHECK (public.is_household_member(auth.uid(), household_id) AND user_id = auth.uid());

CREATE POLICY "Members can update household purchase guard checks"
ON public.purchase_guard_checks FOR UPDATE TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete household purchase guard checks"
ON public.purchase_guard_checks FOR DELETE TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_purchase_guard_household_created ON public.purchase_guard_checks(household_id, created_at DESC);
CREATE INDEX idx_purchase_guard_decision ON public.purchase_guard_checks(household_id, decision);

CREATE TRIGGER update_purchase_guard_checks_updated_at
BEFORE UPDATE ON public.purchase_guard_checks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();