
-- Investment holdings table for normalized investment data from any provider (Akoya, Plaid, etc.)
CREATE TABLE public.investment_holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  symbol TEXT,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  market_value NUMERIC NOT NULL DEFAULT 0,
  cost_basis NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  holding_type TEXT NOT NULL DEFAULT 'equity',
  provider_holding_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.investment_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view holdings"
  ON public.investment_holdings FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert holdings"
  ON public.investment_holdings FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can update holdings"
  ON public.investment_holdings FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete holdings"
  ON public.investment_holdings FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- Add provider_type to accounts table to track which provider sourced the account
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS provider_type TEXT DEFAULT 'manual';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS provider_account_id TEXT;

-- Enable realtime for holdings
ALTER PUBLICATION supabase_realtime ADD TABLE public.investment_holdings;
