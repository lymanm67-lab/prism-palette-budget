
-- Financial mode settings per household
CREATE TABLE public.financial_mode_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  current_mode TEXT NOT NULL DEFAULT 'guardrail' CHECK (current_mode IN ('guardrail', 'balanced', 'greenlight')),
  buffer_percent NUMERIC NOT NULL DEFAULT 20,
  greenlight_unlocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id)
);

ALTER TABLE public.financial_mode_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view mode settings" ON public.financial_mode_settings FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert mode settings" ON public.financial_mode_settings FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update mode settings" ON public.financial_mode_settings FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete mode settings" ON public.financial_mode_settings FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

-- Daily progress tracking for 90-day system
CREATE TABLE public.daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  safe_to_spend NUMERIC NOT NULL DEFAULT 0,
  actual_spent NUMERIC NOT NULL DEFAULT 0,
  within_budget BOOLEAN NOT NULL DEFAULT true,
  mode TEXT NOT NULL DEFAULT 'guardrail',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, date)
);

ALTER TABLE public.daily_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view daily progress" ON public.daily_progress FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert daily progress" ON public.daily_progress FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update daily progress" ON public.daily_progress FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete daily progress" ON public.daily_progress FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

-- Trigger for updated_at on financial_mode_settings
CREATE TRIGGER update_financial_mode_settings_updated_at
BEFORE UPDATE ON public.financial_mode_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
