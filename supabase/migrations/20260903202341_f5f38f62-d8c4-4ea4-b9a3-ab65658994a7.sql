CREATE TABLE public.freed_cash_utility_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  source_id uuid REFERENCES public.freed_cash_sources(id) ON DELETE SET NULL,
  utility_type text NOT NULL DEFAULT 'electricity',
  billing_month date NOT NULL,
  kwh_used numeric NOT NULL DEFAULT 0,
  supplier text,
  rate_per_kwh numeric,
  actual_cost numeric NOT NULL DEFAULT 0,
  benchmark_cost numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.freed_cash_utility_bills TO authenticated;
GRANT ALL ON public.freed_cash_utility_bills TO service_role;

ALTER TABLE public.freed_cash_utility_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members manage utility bills"
ON public.freed_cash_utility_bills FOR ALL TO authenticated
USING (public.is_household_member(auth.uid(), household_id))
WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_fc_utility_bills_household_month ON public.freed_cash_utility_bills (household_id, billing_month DESC);

CREATE TRIGGER trg_fc_utility_bills_updated_at
BEFORE UPDATE ON public.freed_cash_utility_bills
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();