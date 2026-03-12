
CREATE TABLE public.metro2_findings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  credit_account_id uuid NOT NULL REFERENCES public.credit_accounts(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'medium',
  violation_type text NOT NULL,
  title text NOT NULL,
  explanation text NOT NULL,
  metro2_principle text,
  recommended_action text,
  is_resolved boolean NOT NULL DEFAULT false,
  scan_batch_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.metro2_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view metro2 findings" ON public.metro2_findings FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert metro2 findings" ON public.metro2_findings FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update metro2 findings" ON public.metro2_findings FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete metro2 findings" ON public.metro2_findings FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));
