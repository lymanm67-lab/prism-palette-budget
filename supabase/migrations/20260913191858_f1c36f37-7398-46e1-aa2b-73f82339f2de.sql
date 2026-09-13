REVOKE SELECT ON public.plaid_items FROM authenticated;
REVOKE SELECT ON public.plaid_items FROM anon;
GRANT SELECT (id, household_id, plaid_item_id, institution_id, institution_name, status, consent_expiration, created_at, updated_at, provider_type) ON public.plaid_items TO authenticated;
GRANT ALL ON public.plaid_items TO service_role;