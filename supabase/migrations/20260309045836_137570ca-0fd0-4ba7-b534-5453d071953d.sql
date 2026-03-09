-- Fix: Restrict plaid_items UPDATE to owners only (not all members)
DROP POLICY IF EXISTS "Members can update plaid items" ON public.plaid_items;

CREATE POLICY "Owners can update plaid items"
ON public.plaid_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = plaid_items.household_id
    AND hm.user_id = auth.uid()
    AND hm.role = 'owner'
  )
);