
CREATE TABLE public.roadmap_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  step_number integer NOT NULL CHECK (step_number >= 1 AND step_number <= 9),
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (household_id, step_number)
);

ALTER TABLE public.roadmap_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view roadmap progress"
  ON public.roadmap_progress FOR SELECT
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert roadmap progress"
  ON public.roadmap_progress FOR INSERT
  TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can update roadmap progress"
  ON public.roadmap_progress FOR UPDATE
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete roadmap progress"
  ON public.roadmap_progress FOR DELETE
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));
