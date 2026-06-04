-- Lock down plaid_items.plaid_access_token
REVOKE SELECT ON public.plaid_items FROM authenticated;
GRANT SELECT (id, household_id, plaid_item_id, institution_id, institution_name, status, consent_expiration, created_at, updated_at)
  ON public.plaid_items TO authenticated;

-- Lock down snaptrade_connections.snaptrade_user_secret
REVOKE SELECT ON public.snaptrade_connections FROM authenticated;
GRANT SELECT (id, household_id, snaptrade_user_id, brokerage_authorization_id, institution_name, status, created_at, updated_at)
  ON public.snaptrade_connections TO authenticated;

-- service_role retains full access (already granted)
GRANT ALL ON public.plaid_items TO service_role;
GRANT ALL ON public.snaptrade_connections TO service_role;