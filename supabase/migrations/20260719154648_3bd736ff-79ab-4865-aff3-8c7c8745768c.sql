
-- 1) credit_documents: add missing UPDATE policy for household members
CREATE POLICY "Members can update credit documents"
  ON public.credit_documents
  FOR UPDATE
  TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

-- 2) snaptrade_connections: revoke column-level SELECT on the sensitive secret
--    from client roles so it can only be read by service_role in edge functions.
REVOKE SELECT (snaptrade_user_secret) ON public.snaptrade_connections FROM authenticated;
REVOKE SELECT (snaptrade_user_secret) ON public.snaptrade_connections FROM anon;
GRANT SELECT (snaptrade_user_secret) ON public.snaptrade_connections TO service_role;
