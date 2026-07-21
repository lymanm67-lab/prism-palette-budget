
CREATE TABLE public.monthly_financial_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  user_id UUID NOT NULL,
  period_month DATE NOT NULL,
  summary_md TEXT,
  wins JSONB DEFAULT '[]'::jsonb,
  concerns JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_financial_reviews TO authenticated;
GRANT ALL ON public.monthly_financial_reviews TO service_role;
ALTER TABLE public.monthly_financial_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hh members view mfr" ON public.monthly_financial_reviews FOR SELECT USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hh members insert mfr" ON public.monthly_financial_reviews FOR INSERT WITH CHECK (public.is_household_member(auth.uid(), household_id) AND auth.uid() = user_id);
CREATE POLICY "hh members update mfr" ON public.monthly_financial_reviews FOR UPDATE USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hh members delete mfr" ON public.monthly_financial_reviews FOR DELETE USING (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER upd_mfr BEFORE UPDATE ON public.monthly_financial_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.legacy_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  user_id UUID NOT NULL,
  recipient TEXT NOT NULL,
  title TEXT,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legacy_letters TO authenticated;
GRANT ALL ON public.legacy_letters TO service_role;
ALTER TABLE public.legacy_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hh legacy letters" ON public.legacy_letters FOR ALL USING (public.is_household_member(auth.uid(), household_id)) WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER upd_ll BEFORE UPDATE ON public.legacy_letters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ethical_wills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  user_id UUID NOT NULL,
  values_md TEXT,
  wisdom_md TEXT,
  lessons_md TEXT,
  blessings_md TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ethical_wills TO authenticated;
GRANT ALL ON public.ethical_wills TO service_role;
ALTER TABLE public.ethical_wills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hh ethical wills" ON public.ethical_wills FOR ALL USING (public.is_household_member(auth.uid(), household_id)) WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER upd_ew BEFORE UPDATE ON public.ethical_wills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.annual_family_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  user_id UUID NOT NULL,
  meeting_date DATE NOT NULL,
  agenda_md TEXT,
  notes_md TEXT,
  attendees JSONB DEFAULT '[]'::jsonb,
  decisions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.annual_family_meetings TO authenticated;
GRANT ALL ON public.annual_family_meetings TO service_role;
ALTER TABLE public.annual_family_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hh annual meetings" ON public.annual_family_meetings FOR ALL USING (public.is_household_member(auth.uid(), household_id)) WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER upd_afm BEFORE UPDATE ON public.annual_family_meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.retirement_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  user_id UUID NOT NULL,
  next_dollar_target TEXT,
  reasoning_md TEXT,
  allocations JSONB DEFAULT '[]'::jsonb,
  hsa_analysis JSONB DEFAULT '{}'::jsonb,
  roth_vs_trad JSONB DEFAULT '{}'::jsonb,
  employer_benefits JSONB DEFAULT '{}'::jsonb,
  score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retirement_recommendations TO authenticated;
GRANT ALL ON public.retirement_recommendations TO service_role;
ALTER TABLE public.retirement_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hh retirement recs" ON public.retirement_recommendations FOR ALL USING (public.is_household_member(auth.uid(), household_id)) WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER upd_rr BEFORE UPDATE ON public.retirement_recommendations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
