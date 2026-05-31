CREATE TABLE public.legacy_trust_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  source_asset_key TEXT,
  source_label TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.legacy_trust_contributions TO authenticated;
GRANT ALL ON public.legacy_trust_contributions TO service_role;

ALTER TABLE public.legacy_trust_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view legacy contributions"
ON public.legacy_trust_contributions FOR SELECT TO authenticated
USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert legacy contributions"
ON public.legacy_trust_contributions FOR INSERT TO authenticated
WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can update legacy contributions"
ON public.legacy_trust_contributions FOR UPDATE TO authenticated
USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete legacy contributions"
ON public.legacy_trust_contributions FOR DELETE TO authenticated
USING (is_household_member(auth.uid(), household_id));

CREATE INDEX idx_legacy_contrib_plan ON public.legacy_trust_contributions(plan_id, contribution_date DESC);
CREATE INDEX idx_legacy_contrib_household ON public.legacy_trust_contributions(household_id);

CREATE TRIGGER update_legacy_trust_contributions_updated_at
BEFORE UPDATE ON public.legacy_trust_contributions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();