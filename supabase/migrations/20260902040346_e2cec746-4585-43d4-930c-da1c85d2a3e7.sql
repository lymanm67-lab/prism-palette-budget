ALTER TABLE public.reserve_funds
  ADD COLUMN liquidity_class TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN account_type TEXT,
  ADD COLUMN goal_label TEXT,
  ADD COLUMN market_value NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN redirect_excess_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN redirect_investments_pct NUMERIC NOT NULL DEFAULT 60,
  ADD COLUMN redirect_other_pct NUMERIC NOT NULL DEFAULT 40;

UPDATE public.reserve_funds SET liquidity_class = 'emergency_cash' WHERE kind = 'emergency';
UPDATE public.reserve_funds SET liquidity_class = 'short_term_savings' WHERE kind = 'vehicle';