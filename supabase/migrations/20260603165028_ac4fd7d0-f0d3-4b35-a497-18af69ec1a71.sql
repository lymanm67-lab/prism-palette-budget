
-- 1) Revoke column-level SELECT on plaid_items.plaid_access_token
REVOKE SELECT (plaid_access_token) ON public.plaid_items FROM authenticated, anon;

-- 2) Revoke column-level SELECT on snaptrade_connections.snaptrade_user_secret
REVOKE SELECT (snaptrade_user_secret) ON public.snaptrade_connections FROM authenticated, anon;

-- 3) Tighten merchant_normalizations SELECT policy to household members only
DROP POLICY IF EXISTS "Members can view normalizations" ON public.merchant_normalizations;
CREATE POLICY "Members can view normalizations"
  ON public.merchant_normalizations
  FOR SELECT
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));
