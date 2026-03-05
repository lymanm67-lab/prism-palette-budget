
-- Create a security definer function to atomically create household + membership
CREATE OR REPLACE FUNCTION public.create_household_for_user(_name TEXT DEFAULT 'My Household')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _household_id UUID;
BEGIN
  INSERT INTO public.households (name)
  VALUES (_name)
  RETURNING id INTO _household_id;

  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (_household_id, auth.uid(), 'owner');

  RETURN _household_id;
END;
$$;
