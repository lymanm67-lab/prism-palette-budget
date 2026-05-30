-- Fix permission denied for helper functions used by RLS policies
GRANT EXECUTE ON FUNCTION public.is_household_member(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_household_for_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_household_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_plaid_items_safe() TO authenticated;