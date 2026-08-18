CREATE TABLE public.blueprint_assumptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX blueprint_assumptions_household_uniq ON public.blueprint_assumptions (household_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprint_assumptions TO authenticated;
GRANT ALL ON public.blueprint_assumptions TO service_role;

ALTER TABLE public.blueprint_assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members manage blueprint assumptions"
ON public.blueprint_assumptions FOR ALL TO authenticated
USING (public.is_household_member(auth.uid(), household_id))
WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_blueprint_assumptions_updated_at
BEFORE UPDATE ON public.blueprint_assumptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();