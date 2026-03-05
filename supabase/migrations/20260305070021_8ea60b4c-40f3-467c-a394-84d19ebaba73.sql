
CREATE TABLE public.homebuyer_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (household_id, question_number)
);

ALTER TABLE public.homebuyer_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view checklist" ON public.homebuyer_checklist
  FOR SELECT USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert checklist" ON public.homebuyer_checklist
  FOR INSERT WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can update checklist" ON public.homebuyer_checklist
  FOR UPDATE USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete checklist" ON public.homebuyer_checklist
  FOR DELETE USING (is_household_member(auth.uid(), household_id));
