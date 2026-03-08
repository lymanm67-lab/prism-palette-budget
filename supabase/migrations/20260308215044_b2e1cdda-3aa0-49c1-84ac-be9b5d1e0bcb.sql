
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#7c5cf5',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subcategories" ON public.subcategories
  FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert subcategories" ON public.subcategories
  FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can update subcategories" ON public.subcategories
  FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete subcategories" ON public.subcategories
  FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));
