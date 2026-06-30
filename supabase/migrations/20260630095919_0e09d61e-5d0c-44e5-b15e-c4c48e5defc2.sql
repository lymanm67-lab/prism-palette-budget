
DROP POLICY IF EXISTS "Owners can view invitations" ON public.household_invitations;
CREATE POLICY "Inviters can view their invitations"
  ON public.household_invitations
  FOR SELECT
  TO authenticated
  USING (invited_by = auth.uid());

REVOKE SELECT ON public.plaid_items FROM authenticated;
GRANT SELECT (id, household_id, plaid_item_id, institution_id, institution_name, status, consent_expiration, created_at, updated_at) ON public.plaid_items TO authenticated;

REVOKE SELECT ON public.snaptrade_connections FROM authenticated;
GRANT SELECT (id, household_id, snaptrade_user_id, brokerage_authorization_id, institution_name, status, created_at, updated_at) ON public.snaptrade_connections TO authenticated;
