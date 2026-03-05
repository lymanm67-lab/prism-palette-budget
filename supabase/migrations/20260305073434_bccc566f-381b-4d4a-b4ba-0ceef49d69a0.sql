-- Add DELETE policy for profiles (users can delete own profile)
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add DELETE policy for households (owners can delete their household)
CREATE POLICY "Owner can delete household"
ON public.households
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = households.id
      AND user_id = auth.uid()
      AND role = 'owner'
  )
);

-- Add DELETE policy for household_members (owners can remove members, members can remove themselves)
CREATE POLICY "Members can delete membership"
ON public.household_members
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'owner'
  )
);

-- Add UPDATE policy for household_members (owners can change roles)
CREATE POLICY "Owner can update membership"
ON public.household_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'owner'
  )
);

-- Add UPDATE policy for saved_tax_responses
CREATE POLICY "Users can update own saved responses"
ON public.saved_tax_responses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable security_invoker on plaid_items_safe view so underlying RLS applies
ALTER VIEW public.plaid_items_safe SET (security_invoker = true);