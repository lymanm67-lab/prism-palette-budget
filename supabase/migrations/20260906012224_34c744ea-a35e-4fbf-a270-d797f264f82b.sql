CREATE TABLE public.freed_cash_month_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  entity_scope TEXT NOT NULL DEFAULT 'all',
  period_month DATE NOT NULL,
  realized_monthly NUMERIC NOT NULL DEFAULT 0,
  run_rate NUMERIC NOT NULL DEFAULT 0,
  created_monthly NUMERIC NOT NULL DEFAULT 0,
  executed_monthly NUMERIC NOT NULL DEFAULT 0,
  unallocated_monthly NUMERIC NOT NULL DEFAULT 0,
  source_count INTEGER NOT NULL DEFAULT 0,
  locked BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, entity_scope, period_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.freed_cash_month_snapshots TO authenticated;
GRANT ALL ON public.freed_cash_month_snapshots TO service_role;

ALTER TABLE public.freed_cash_month_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view freed cash snapshots"
  ON public.freed_cash_month_snapshots FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can add freed cash snapshots"
  ON public.freed_cash_month_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can update freed cash snapshots"
  ON public.freed_cash_month_snapshots FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can delete freed cash snapshots"
  ON public.freed_cash_month_snapshots FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_freed_cash_month_snapshots_updated_at
  BEFORE UPDATE ON public.freed_cash_month_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();