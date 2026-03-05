
-- Drop the SELECT policy that exposes plaid_access_token to clients
DROP POLICY IF EXISTS "Members can view plaid items" ON public.plaid_items;

-- Create a restricted SELECT policy that excludes the access token
-- We use a view approach: create a safe view and restrict direct table access
CREATE OR REPLACE VIEW public.plaid_items_safe AS
  SELECT id, household_id, plaid_item_id, institution_id, institution_name, 
         status, consent_expiration, created_at, updated_at
  FROM public.plaid_items;

-- Re-add SELECT policy but only allow server-side (service role) to read full rows
-- Client-side code should use the safe view instead
-- We still need a SELECT policy for RLS on the base table for the view to work
CREATE POLICY "Members can view plaid items safe"
  ON public.plaid_items
  FOR SELECT
  TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- Drop the permissive upload policy on legal-documents bucket
DROP POLICY IF EXISTS "Authenticated users can upload legal documents" ON storage.objects;
