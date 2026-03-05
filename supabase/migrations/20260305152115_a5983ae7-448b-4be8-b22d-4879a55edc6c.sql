-- Drop the existing view
DROP VIEW IF EXISTS public.plaid_items_safe;

-- Drop the SELECT policy on the base table that exposes access tokens
DROP POLICY IF EXISTS "Members can view plaid items safe" ON public.plaid_items;

-- Recreate view as SECURITY DEFINER (owned by postgres, bypasses RLS)
CREATE VIEW public.plaid_items_safe
WITH (security_invoker = false)
AS
SELECT
  id,
  household_id,
  plaid_item_id,
  institution_id,
  institution_name,
  status,
  consent_expiration,
  created_at,
  updated_at
FROM public.plaid_items
WHERE is_household_member(auth.uid(), household_id);

-- Grant SELECT on the safe view to authenticated users
GRANT SELECT ON public.plaid_items_safe TO authenticated;

-- Revoke direct SELECT on plaid_items from authenticated (service role still has access)
REVOKE SELECT ON public.plaid_items FROM authenticated;