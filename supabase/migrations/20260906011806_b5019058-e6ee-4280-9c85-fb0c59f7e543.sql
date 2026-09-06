CREATE TABLE public.freed_cash_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  source_id UUID NOT NULL REFERENCES public.freed_cash_sources(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  statement_date DATE,
  expected_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC NOT NULL DEFAULT 0,
  evidence TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.freed_cash_statements TO authenticated;
GRANT ALL ON public.freed_cash_statements TO service_role;

ALTER TABLE public.freed_cash_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view freed cash statements"
  ON public.freed_cash_statements FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can add freed cash statements"
  ON public.freed_cash_statements FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can update freed cash statements"
  ON public.freed_cash_statements FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can delete freed cash statements"
  ON public.freed_cash_statements FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_freed_cash_statements_source ON public.freed_cash_statements (source_id, period_month);

CREATE TRIGGER update_freed_cash_statements_updated_at
  BEFORE UPDATE ON public.freed_cash_statements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();