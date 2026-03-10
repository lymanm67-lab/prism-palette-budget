
-- SnapTrade connections table (mirrors plaid_items pattern)
CREATE TABLE public.snaptrade_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  snaptrade_user_id text NOT NULL,
  snaptrade_user_secret text NOT NULL,
  brokerage_authorization_id text,
  institution_name text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.snaptrade_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view snaptrade connections"
  ON public.snaptrade_connections FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert snaptrade connections"
  ON public.snaptrade_connections FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can update snaptrade connections"
  ON public.snaptrade_connections FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete snaptrade connections"
  ON public.snaptrade_connections FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- Add updated_at trigger
CREATE TRIGGER update_snaptrade_connections_updated_at
  BEFORE UPDATE ON public.snaptrade_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
