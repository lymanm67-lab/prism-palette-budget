
-- Auto-split rules engine
CREATE TABLE public.auto_split_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  match_type TEXT NOT NULL CHECK (match_type IN ('merchant','description_keyword','category')),
  match_value TEXT NOT NULL,
  date_range_start DATE,
  date_range_end DATE,
  amount_min NUMERIC(14,2),
  amount_max NUMERIC(14,2),
  business_profile_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  business_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  personal_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  business_split_pct NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (business_split_pct >= 0 AND business_split_pct <= 100),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  last_run_at TIMESTAMPTZ,
  last_run_match_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auto_split_rules TO authenticated;
GRANT ALL ON public.auto_split_rules TO service_role;

ALTER TABLE public.auto_split_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view auto_split_rules" ON public.auto_split_rules FOR SELECT TO authenticated
USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members insert auto_split_rules" ON public.auto_split_rules FOR INSERT TO authenticated
WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members update auto_split_rules" ON public.auto_split_rules FOR UPDATE TO authenticated
USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members delete auto_split_rules" ON public.auto_split_rules FOR DELETE TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER set_updated_at_auto_split_rules
BEFORE UPDATE ON public.auto_split_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_auto_split_rules_household_active ON public.auto_split_rules(household_id, is_active);

-- Data quality issues
CREATE TABLE public.data_quality_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','error')),
  title TEXT NOT NULL,
  description TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_quality_issues TO authenticated;
GRANT ALL ON public.data_quality_issues TO service_role;

ALTER TABLE public.data_quality_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view dqi" ON public.data_quality_issues FOR SELECT TO authenticated
USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members insert dqi" ON public.data_quality_issues FOR INSERT TO authenticated
WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members update dqi" ON public.data_quality_issues FOR UPDATE TO authenticated
USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members delete dqi" ON public.data_quality_issues FOR DELETE TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER set_updated_at_dqi
BEFORE UPDATE ON public.data_quality_issues
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dqi_household_open ON public.data_quality_issues(household_id, resolved_at);
