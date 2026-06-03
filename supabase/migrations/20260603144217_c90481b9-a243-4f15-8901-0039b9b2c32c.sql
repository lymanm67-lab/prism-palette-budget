
-- 1. app_dev_overrides DELETE policy
CREATE POLICY "Requesters or admins can delete overrides"
ON public.app_dev_overrides
FOR DELETE
TO authenticated
USING (
  is_household_member(auth.uid(), household_id)
  AND (requested_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
);

-- 2. method_entities: restrict SELECT to the owning user
DROP POLICY IF EXISTS "Household members can view method_entities" ON public.method_entities;
CREATE POLICY "Users can view their own method_entities"
ON public.method_entities
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND is_household_member(auth.uid(), household_id));

-- Also restrict UPDATE/DELETE to the owning user (KYC is personal)
DROP POLICY IF EXISTS "Household members can update method_entities" ON public.method_entities;
CREATE POLICY "Users can update their own method_entities"
ON public.method_entities
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND is_household_member(auth.uid(), household_id));

DROP POLICY IF EXISTS "Household members can delete method_entities" ON public.method_entities;
CREATE POLICY "Users can delete their own method_entities"
ON public.method_entities
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND is_household_member(auth.uid(), household_id));

-- 3. plaid_items: defense-in-depth revoke on access token column
REVOKE SELECT (plaid_access_token) ON public.plaid_items FROM anon, authenticated;

-- 4. realtime.messages INSERT policy scoped to user's household topic
CREATE POLICY "Members can publish to household realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.user_id = auth.uid()
      AND realtime.topic() = ('realtime-' || hm.household_id::text)
  )
);
