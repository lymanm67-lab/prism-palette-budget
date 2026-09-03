CREATE TABLE public.freed_cash_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  name TEXT NOT NULL,
  vendor TEXT,
  category TEXT,
  entity_scope TEXT NOT NULL DEFAULT 'personal',
  source_type TEXT NOT NULL DEFAULT 'cancellation',
  original_amount NUMERIC NOT NULL DEFAULT 0,
  new_amount NUMERIC NOT NULL DEFAULT 0,
  billing_frequency TEXT NOT NULL DEFAULT 'monthly',
  added_fees NUMERIC NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  classification TEXT NOT NULL DEFAULT 'optional',
  is_temporary BOOLEAN NOT NULL DEFAULT false,
  resume_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.freed_cash_sources TO authenticated;
GRANT ALL ON public.freed_cash_sources TO service_role;

ALTER TABLE public.freed_cash_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view freed cash sources"
ON public.freed_cash_sources FOR SELECT TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can insert freed cash sources"
ON public.freed_cash_sources FOR INSERT TO authenticated
WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can update freed cash sources"
ON public.freed_cash_sources FOR UPDATE TO authenticated
USING (public.is_household_member(auth.uid(), household_id))
WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can delete freed cash sources"
ON public.freed_cash_sources FOR DELETE TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_freed_cash_sources_household ON public.freed_cash_sources (household_id, effective_date DESC);

CREATE TRIGGER update_freed_cash_sources_updated_at
BEFORE UPDATE ON public.freed_cash_sources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();