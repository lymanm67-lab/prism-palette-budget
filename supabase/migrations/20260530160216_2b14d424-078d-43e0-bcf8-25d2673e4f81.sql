
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.advance_recurring_next_due_date() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.adjust_account_balance() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_household_member(uuid, uuid) FROM authenticated;
-- Keep these callable by authenticated users (used by app):
-- create_household_for_user, accept_household_invitation, get_plaid_items_safe
GRANT EXECUTE ON FUNCTION public.create_household_for_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_household_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_plaid_items_safe() TO authenticated;
