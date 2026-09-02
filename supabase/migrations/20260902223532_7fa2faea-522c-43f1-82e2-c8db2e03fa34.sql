CREATE TABLE public.inv_position_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  position_id uuid REFERENCES public.inv_role_positions(id) ON DELETE SET NULL,
  ticker text NOT NULL,
  trade_date date NOT NULL,
  shares numeric NOT NULL DEFAULT 0,
  price_per_share numeric NOT NULL DEFAULT 0,
  fees numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  account_type text,
  source text NOT NULL DEFAULT 'manual',
  external_id text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_position_lots TO authenticated;
GRANT ALL ON public.inv_position_lots TO service_role;
ALTER TABLE public.inv_position_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage investment lots"
  ON public.inv_position_lots FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_inv_position_lots_household ON public.inv_position_lots (household_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inv_position_lots_position ON public.inv_position_lots (position_id);
CREATE UNIQUE INDEX idx_inv_position_lots_dedupe
  ON public.inv_position_lots (household_id, ticker, trade_date, shares, price_per_share)
  WHERE deleted_at IS NULL;

CREATE TRIGGER update_inv_position_lots_updated_at
  BEFORE UPDATE ON public.inv_position_lots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inv_dividends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  position_id uuid REFERENCES public.inv_role_positions(id) ON DELETE SET NULL,
  ticker text NOT NULL,
  pay_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  income_type text NOT NULL DEFAULT 'dividend',
  account_type text,
  source text NOT NULL DEFAULT 'manual',
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_dividends TO authenticated;
GRANT ALL ON public.inv_dividends TO service_role;
ALTER TABLE public.inv_dividends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage investment dividends"
  ON public.inv_dividends FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_inv_dividends_household ON public.inv_dividends (household_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inv_dividends_position ON public.inv_dividends (position_id);

CREATE TRIGGER update_inv_dividends_updated_at
  BEFORE UPDATE ON public.inv_dividends
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();