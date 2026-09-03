CREATE TABLE public.freed_cash_redirects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  source_id UUID REFERENCES public.freed_cash_sources(id) ON DELETE SET NULL,
  destination_type TEXT NOT NULL DEFAULT 'emergency_fund',
  destination_label TEXT,
  monthly_amount NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'planned',
  confirmed_moved BOOLEAN NOT NULL DEFAULT false,
  last_confirmed_on DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.freed_cash_redirects TO authenticated;
GRANT ALL ON public.freed_cash_redirects TO service_role;
ALTER TABLE public.freed_cash_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view freed cash redirects"
ON public.freed_cash_redirects FOR SELECT TO authenticated
USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can insert freed cash redirects"
ON public.freed_cash_redirects FOR INSERT TO authenticated
WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update freed cash redirects"
ON public.freed_cash_redirects FOR UPDATE TO authenticated
USING (public.is_household_member(auth.uid(), household_id))
WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete freed cash redirects"
ON public.freed_cash_redirects FOR DELETE TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_freed_cash_redirects_household ON public.freed_cash_redirects (household_id, start_date DESC);

CREATE TRIGGER update_freed_cash_redirects_updated_at
BEFORE UPDATE ON public.freed_cash_redirects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.freed_cash_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL UNIQUE,
  emergency_floor NUMERIC NOT NULL DEFAULT 2000,
  waterfall JSONB NOT NULL DEFAULT '["emergency_fund","debt_payoff","investing","buffer","goal"]'::jsonb,
  sweep_mode TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.freed_cash_settings TO authenticated;
GRANT ALL ON public.freed_cash_settings TO service_role;
ALTER TABLE public.freed_cash_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view freed cash settings"
ON public.freed_cash_settings FOR SELECT TO authenticated
USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can insert freed cash settings"
ON public.freed_cash_settings FOR INSERT TO authenticated
WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update freed cash settings"
ON public.freed_cash_settings FOR UPDATE TO authenticated
USING (public.is_household_member(auth.uid(), household_id))
WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete freed cash settings"
ON public.freed_cash_settings FOR DELETE TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_freed_cash_settings_updated_at
BEFORE UPDATE ON public.freed_cash_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.freed_cash_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  review_month DATE NOT NULL,
  verified_monthly NUMERIC NOT NULL DEFAULT 0,
  redirected_monthly NUMERIC NOT NULL DEFAULT 0,
  unassigned_monthly NUMERIC NOT NULL DEFAULT 0,
  capture_rate NUMERIC NOT NULL DEFAULT 0,
  wins TEXT,
  leaks_found TEXT,
  next_actions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.freed_cash_reviews TO authenticated;
GRANT ALL ON public.freed_cash_reviews TO service_role;
ALTER TABLE public.freed_cash_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view freed cash reviews"
ON public.freed_cash_reviews FOR SELECT TO authenticated
USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can insert freed cash reviews"
ON public.freed_cash_reviews FOR INSERT TO authenticated
WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update freed cash reviews"
ON public.freed_cash_reviews FOR UPDATE TO authenticated
USING (public.is_household_member(auth.uid(), household_id))
WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete freed cash reviews"
ON public.freed_cash_reviews FOR DELETE TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_freed_cash_reviews_household ON public.freed_cash_reviews (household_id, review_month DESC);

CREATE TRIGGER update_freed_cash_reviews_updated_at
BEFORE UPDATE ON public.freed_cash_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();