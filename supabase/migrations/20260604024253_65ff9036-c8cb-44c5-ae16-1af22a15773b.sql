
-- 1. method_entities: tighten INSERT to require user_id = auth.uid()
DROP POLICY IF EXISTS "Household members can insert method_entities" ON public.method_entities;
CREATE POLICY "Users can insert their own method_entities"
ON public.method_entities
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_household_member(auth.uid(), household_id));

-- 2. plaid_items: revoke column-level SELECT on plaid_access_token from client roles
REVOKE SELECT (plaid_access_token) ON public.plaid_items FROM authenticated;
REVOKE SELECT (plaid_access_token) ON public.plaid_items FROM anon;

-- 3. snaptrade_connections: revoke column-level SELECT on snaptrade_user_secret from client roles
REVOKE SELECT (snaptrade_user_secret) ON public.snaptrade_connections FROM authenticated;
REVOKE SELECT (snaptrade_user_secret) ON public.snaptrade_connections FROM anon;

-- 4. household_invitations: allow the invitee to see their own pending invitation
CREATE POLICY "Invitees can view their own pending invitations"
ON public.household_invitations
FOR SELECT
TO authenticated
USING (
  lower(email) = lower(auth.jwt() ->> 'email')
  AND status = 'pending'
  AND expires_at > now()
);
