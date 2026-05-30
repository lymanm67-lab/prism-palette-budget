REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_household_member(uuid, uuid) FROM authenticated;