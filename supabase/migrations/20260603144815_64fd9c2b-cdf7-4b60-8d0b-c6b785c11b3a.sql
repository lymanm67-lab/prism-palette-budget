REVOKE SELECT (plaid_access_token) ON public.plaid_items FROM anon, authenticated;
REVOKE SELECT (snaptrade_user_secret, snaptrade_user_id) ON public.snaptrade_connections FROM anon, authenticated;