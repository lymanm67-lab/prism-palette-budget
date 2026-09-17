CREATE TABLE public.se_broker_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  sector TEXT,
  status TEXT NOT NULL DEFAULT 'WAIT_COND',
  entry_price NUMERIC,
  stop_price NUMERIC,
  target_price NUMERIC,
  shares NUMERIC,
  source TEXT NOT NULL DEFAULT 'THINKORSWIM_PASTE',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_broker_orders TO authenticated;
GRANT ALL ON public.se_broker_orders TO service_role;

ALTER TABLE public.se_broker_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members manage broker orders"
ON public.se_broker_orders FOR ALL TO authenticated
USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()))
WITH CHECK (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

CREATE INDEX idx_se_broker_orders_household ON public.se_broker_orders(household_id) WHERE deleted_at IS NULL;

CREATE TRIGGER update_se_broker_orders_updated_at
BEFORE UPDATE ON public.se_broker_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();