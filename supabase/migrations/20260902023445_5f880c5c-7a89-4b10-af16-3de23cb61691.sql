-- Capital events (one-time, non-recurring funding events)
CREATE TABLE public.capital_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_type TEXT NOT NULL DEFAULT 'stock_sale',
  source TEXT,
  description TEXT NOT NULL DEFAULT '',
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  cost_basis NUMERIC,
  estimated_gain_loss NUMERIC,
  destination TEXT NOT NULL DEFAULT 'business_capital',
  tax_notes TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  include_in_budget_pct BOOLEAN NOT NULL DEFAULT false,
  include_in_allocation_pct BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.capital_events TO authenticated;
GRANT ALL ON public.capital_events TO service_role;

ALTER TABLE public.capital_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view capital events"
  ON public.capital_events FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can insert capital events"
  ON public.capital_events FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can update capital events"
  ON public.capital_events FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can delete capital events"
  ON public.capital_events FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER trg_capital_events_updated
  BEFORE UPDATE ON public.capital_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_capital_events_household_date
  ON public.capital_events (household_id, event_date DESC);

-- Business capital reserve ledger
CREATE TABLE public.capital_reserve_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  capital_event_id UUID REFERENCES public.capital_events(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  direction TEXT NOT NULL DEFAULT 'spent',
  description TEXT NOT NULL DEFAULT '',
  expense_category TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  funding_source TEXT NOT NULL DEFAULT 'business_capital_reserve',
  notes TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.capital_reserve_ledger TO authenticated;
GRANT ALL ON public.capital_reserve_ledger TO service_role;

ALTER TABLE public.capital_reserve_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view reserve ledger"
  ON public.capital_reserve_ledger FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can insert reserve ledger"
  ON public.capital_reserve_ledger FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can update reserve ledger"
  ON public.capital_reserve_ledger FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can delete reserve ledger"
  ON public.capital_reserve_ledger FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER trg_capital_reserve_ledger_updated
  BEFORE UPDATE ON public.capital_reserve_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_capital_reserve_ledger_household_date
  ON public.capital_reserve_ledger (household_id, entry_date DESC);