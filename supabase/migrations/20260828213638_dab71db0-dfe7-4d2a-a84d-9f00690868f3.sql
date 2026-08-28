CREATE TABLE IF NOT EXISTS public.payroll_elections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  label text NOT NULL,
  owner text NOT NULL DEFAULT 'lyman',
  amount numeric NOT NULL DEFAULT 0,
  tax_treatment text NOT NULL DEFAULT 'pre_tax',
  counts_as_wealth boolean NOT NULL DEFAULT false,
  is_employer boolean NOT NULL DEFAULT false,
  effective_start date NOT NULL DEFAULT CURRENT_DATE,
  effective_end date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_elections TO authenticated;
GRANT ALL ON public.payroll_elections TO service_role;

ALTER TABLE public.payroll_elections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members manage payroll elections"
ON public.payroll_elections FOR ALL TO authenticated
USING (public.is_household_member(auth.uid(), household_id))
WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER trg_payroll_elections_updated
BEFORE UPDATE ON public.payroll_elections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_payroll_elections_household ON public.payroll_elections (household_id, effective_start);