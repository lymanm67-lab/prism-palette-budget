CREATE TABLE public.guardrail_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  daily_limit numeric DEFAULT NULL,
  weekly_limit numeric DEFAULT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(household_id)
);

CREATE TABLE public.guardrail_category_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardrail_id uuid NOT NULL REFERENCES public.guardrail_settings(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  weekly_limit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(guardrail_id, category_id)
);

ALTER TABLE public.guardrail_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardrail_category_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view guardrails" ON public.guardrail_settings FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert guardrails" ON public.guardrail_settings FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update guardrails" ON public.guardrail_settings FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete guardrails" ON public.guardrail_settings FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can view category limits" ON public.guardrail_category_limits FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.guardrail_settings g WHERE g.id = guardrail_id AND is_household_member(auth.uid(), g.household_id)));
CREATE POLICY "Members can insert category limits" ON public.guardrail_category_limits FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.guardrail_settings g WHERE g.id = guardrail_id AND is_household_member(auth.uid(), g.household_id)));
CREATE POLICY "Members can update category limits" ON public.guardrail_category_limits FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.guardrail_settings g WHERE g.id = guardrail_id AND is_household_member(auth.uid(), g.household_id)));
CREATE POLICY "Members can delete category limits" ON public.guardrail_category_limits FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.guardrail_settings g WHERE g.id = guardrail_id AND is_household_member(auth.uid(), g.household_id)));

CREATE TRIGGER update_guardrail_settings_updated_at BEFORE UPDATE ON public.guardrail_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();