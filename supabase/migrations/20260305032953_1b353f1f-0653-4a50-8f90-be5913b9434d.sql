
-- Business profiles table: supports multiple businesses per household
CREATE TABLE public.business_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'llc',
  ein TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  industry TEXT,
  fiscal_year_end TEXT DEFAULT '12',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view business profiles"
  ON public.business_profiles FOR SELECT
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert business profiles"
  ON public.business_profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can update business profiles"
  ON public.business_profiles FOR UPDATE
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete business profiles"
  ON public.business_profiles FOR DELETE
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));
