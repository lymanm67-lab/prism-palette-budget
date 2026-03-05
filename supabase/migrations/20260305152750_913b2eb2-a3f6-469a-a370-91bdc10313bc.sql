-- The plaid_items_safe view is intentionally SECURITY DEFINER so that
-- authenticated users can read the safe columns without having SELECT
-- on the base plaid_items table (which contains access tokens).
-- The view already filters by is_household_member(auth.uid(), household_id).
-- To satisfy the Supabase linter, add explicit RLS-like grant controls:

-- Ensure anon cannot access the view
REVOKE SELECT ON public.plaid_items_safe FROM anon;

-- Ensure only authenticated can access
GRANT SELECT ON public.plaid_items_safe TO authenticated;