-- Create household invitations table for secure membership flow
CREATE TABLE public.household_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(household_id, email, status)
);

-- Enable RLS on invitations
ALTER TABLE public.household_invitations ENABLE ROW LEVEL SECURITY;

-- Household owners can view invitations for their household
CREATE POLICY "Owners can view invitations"
ON public.household_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = household_invitations.household_id
    AND hm.user_id = auth.uid()
    AND hm.role = 'owner'
  )
);

-- Household owners can create invitations
CREATE POLICY "Owners can create invitations"
ON public.household_invitations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = household_invitations.household_id
    AND hm.user_id = auth.uid()
    AND hm.role = 'owner'
  )
);

-- Household owners can update invitations (e.g., cancel)
CREATE POLICY "Owners can update invitations"
ON public.household_invitations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = household_invitations.household_id
    AND hm.user_id = auth.uid()
    AND hm.role = 'owner'
  )
);

-- Household owners can delete invitations
CREATE POLICY "Owners can delete invitations"
ON public.household_invitations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = household_invitations.household_id
    AND hm.user_id = auth.uid()
    AND hm.role = 'owner'
  )
);

-- Drop the insecure INSERT policy on household_members
DROP POLICY IF EXISTS "Members can insert membership" ON public.household_members;

-- Create a secure INSERT policy that requires a valid pending invitation
CREATE POLICY "Members can join via invitation"
ON public.household_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.household_invitations hi
    JOIN auth.users au ON au.email = hi.email
    WHERE hi.household_id = household_members.household_id
    AND au.id = auth.uid()
    AND hi.status = 'pending'
    AND hi.expires_at > now()
  )
);

-- Create a function to accept an invitation (SECURITY DEFINER to handle the transaction)
CREATE OR REPLACE FUNCTION public.accept_household_invitation(_invitation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation RECORD;
  _user_email TEXT;
BEGIN
  -- Get user's email
  SELECT email INTO _user_email FROM auth.users WHERE id = auth.uid();
  IF _user_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get and validate the invitation
  SELECT * INTO _invitation 
  FROM public.household_invitations 
  WHERE id = _invitation_id 
  AND email = _user_email
  AND status = 'pending'
  AND expires_at > now();

  IF _invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.household_members 
    WHERE household_id = _invitation.household_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Already a member of this household';
  END IF;

  -- Add user to household
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (_invitation.household_id, auth.uid(), 'member');

  -- Mark invitation as accepted
  UPDATE public.household_invitations 
  SET status = 'accepted', accepted_at = now()
  WHERE id = _invitation_id;

  RETURN _invitation.household_id;
END;
$$;