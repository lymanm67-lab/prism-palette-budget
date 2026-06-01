
-- Phase 4: Money Leaks
CREATE TABLE public.money_leaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  leak_type TEXT NOT NULL, -- zombie_subscription | duplicate_subscription | fee_charge | bill_collision | forgotten_trial | subscription_creep | lifestyle_creep | overdraft | late_fee | atm_fee | interest_charge
  title TEXT NOT NULL,
  merchant TEXT,
  source_id UUID, -- subscription_id or transaction_id
  source_type TEXT, -- 'subscription' | 'transaction' | 'recurring'
  monthly_cost NUMERIC NOT NULL DEFAULT 0,
  annual_cost NUMERIC NOT NULL DEFAULT 0,
  three_year_cost NUMERIC NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'medium', -- low | medium | high
  recommended_fix TEXT,
  suggested_redirect TEXT, -- debt | hsa | roth | savings | ef | none
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open', -- open | fixed | dismissed | redirected
  dismissed_at TIMESTAMPTZ,
  fixed_at TIMESTAMPTZ,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.money_leaks TO authenticated;
GRANT ALL ON public.money_leaks TO service_role;

ALTER TABLE public.money_leaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view money leaks" ON public.money_leaks FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members insert money leaks" ON public.money_leaks FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members update money leaks" ON public.money_leaks FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members delete money leaks" ON public.money_leaks FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_money_leaks_household_status ON public.money_leaks(household_id, status);
CREATE INDEX idx_money_leaks_detected ON public.money_leaks(household_id, detected_at DESC);

CREATE TRIGGER trg_money_leaks_updated_at
BEFORE UPDATE ON public.money_leaks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 5: Adaptive Smart Buffer
ALTER TABLE public.financial_mode_settings
  ADD COLUMN IF NOT EXISTS buffer_mode TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS buffer_triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS buffer_last_computed_at TIMESTAMPTZ;

ALTER TABLE public.financial_mode_settings
  ADD CONSTRAINT financial_mode_settings_buffer_mode_check
  CHECK (buffer_mode IN ('manual', 'adaptive'));
