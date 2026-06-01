
-- 1. Audit logs: allow users to read their own null-household entries
CREATE POLICY "Users can view own user-level audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (household_id IS NULL AND auth.uid() = user_id);

-- 2. Storage UPDATE policies for receipts bucket
CREATE POLICY "Users can update their household receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT hm.household_id::text FROM household_members hm WHERE hm.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT hm.household_id::text FROM household_members hm WHERE hm.user_id = auth.uid()
  )
);

-- 3. Storage UPDATE policy for credit-documents bucket
CREATE POLICY "Members can update their household credit docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'credit-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT hm.household_id::text FROM household_members hm WHERE hm.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'credit-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT hm.household_id::text FROM household_members hm WHERE hm.user_id = auth.uid()
  )
);

-- 4. Revoke column SELECT on sensitive Plaid + SnapTrade credentials from client roles.
-- Edge functions use service_role and remain unaffected.
REVOKE SELECT (plaid_access_token) ON public.plaid_items FROM authenticated, anon;
REVOKE SELECT (snaptrade_user_secret) ON public.snaptrade_connections FROM authenticated, anon;
