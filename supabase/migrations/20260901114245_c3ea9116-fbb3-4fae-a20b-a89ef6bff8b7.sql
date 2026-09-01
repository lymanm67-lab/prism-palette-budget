CREATE TABLE public.layer_a_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  sinking_funds NUMERIC,
  buffer_assignment NUMERIC,
  one_time_expenses NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (household_id, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.layer_a_assignments TO authenticated;
GRANT ALL ON public.layer_a_assignments TO service_role;

ALTER TABLE public.layer_a_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members manage layer A assignments"
ON public.layer_a_assignments FOR ALL TO authenticated
USING (public.is_household_member(auth.uid(), household_id))
WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_layer_a_assignments_updated_at
BEFORE UPDATE ON public.layer_a_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();