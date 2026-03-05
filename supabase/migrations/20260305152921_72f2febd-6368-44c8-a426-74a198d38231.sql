-- Drop the existing SECURITY DEFINER view
DROP VIEW IF EXISTS public.plaid_items_safe;

-- Create a SECURITY DEFINER function to fetch plaid items safely
CREATE OR REPLACE FUNCTION public.get_plaid_items_safe()
RETURNS TABLE (
  id uuid,
  household_id uuid,
  plaid_item_id text,
  institution_id text,
  institution_name text,
  status text,
  consent_expiration timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pi.id,
    pi.household_id,
    pi.plaid_item_id,
    pi.institution_id,
    pi.institution_name,
    pi.status,
    pi.consent_expiration,
    pi.created_at,
    pi.updated_at
  FROM public.plaid_items pi
  WHERE public.is_household_member(auth.uid(), pi.household_id);
$$;

-- Create the view as SECURITY INVOKER (default) on top of the function
CREATE VIEW public.plaid_items_safe
WITH (security_invoker = true)
AS
SELECT * FROM public.get_plaid_items_safe();

-- Grant access
GRANT SELECT ON public.plaid_items_safe TO authenticated;
REVOKE SELECT ON public.plaid_items_safe FROM anon;