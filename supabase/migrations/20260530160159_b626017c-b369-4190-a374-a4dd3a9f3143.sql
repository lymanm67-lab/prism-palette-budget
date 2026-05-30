
-- 1. Hide Plaid access token from client SELECTs (column-level revoke).
--    Edge functions use service_role and still have access.
REVOKE SELECT (plaid_access_token) ON public.plaid_items FROM authenticated, anon;

-- 2. Hide SnapTrade user secret and user id from client SELECTs.
REVOKE SELECT (snaptrade_user_secret, snaptrade_user_id) ON public.snaptrade_connections FROM authenticated, anon;

-- 3. Tighten audit_logs INSERT: require household membership when household_id provided.
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (household_id IS NULL OR public.is_household_member(auth.uid(), household_id))
);

-- 4. Fix credit-documents storage policies: scope by household folder.
DROP POLICY IF EXISTS "Authenticated users can upload credit docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own credit docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own credit docs" ON storage.objects;

CREATE POLICY "Members can upload credit docs to their household folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'credit-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT hm.household_id::text FROM public.household_members hm WHERE hm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can read their household credit docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'credit-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT hm.household_id::text FROM public.household_members hm WHERE hm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can delete their household credit docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'credit-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT hm.household_id::text FROM public.household_members hm WHERE hm.user_id = auth.uid()
  )
);

-- 5. Remove broad listing on the public legal-documents bucket.
--    Files remain accessible via direct public URL, just not enumerable via list().
DROP POLICY IF EXISTS "Public read access for legal documents" ON storage.objects;

-- 6. Add Realtime authorization: only allow channel subscriptions scoped to a household
--    the user is a member of. Our app subscribes to channel `realtime-${household.id}`.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read household realtime topics" ON realtime.messages;
CREATE POLICY "Members can read household realtime topics"
ON realtime.messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.user_id = auth.uid()
      AND realtime.topic() = 'realtime-' || hm.household_id::text
  )
);

-- 7. Lock down SECURITY DEFINER functions: revoke EXECUTE from anon/public.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_household_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_household_for_user(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_household_invitation(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_plaid_items_safe() FROM anon, public;
