
-- Table for merchant-to-category mapping rules
CREATE TABLE public.categorization_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  merchant_pattern TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  match_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(household_id, merchant_pattern)
);

-- Enable RLS
ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view categorization rules"
  ON public.categorization_rules FOR SELECT
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert categorization rules"
  ON public.categorization_rules FOR INSERT
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can update categorization rules"
  ON public.categorization_rules FOR UPDATE
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete categorization rules"
  ON public.categorization_rules FOR DELETE
  USING (public.is_household_member(auth.uid(), household_id));
