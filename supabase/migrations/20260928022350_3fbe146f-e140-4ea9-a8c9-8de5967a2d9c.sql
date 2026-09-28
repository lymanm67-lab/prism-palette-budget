CREATE TABLE public.household_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL UNIQUE,
  lyman_dob date,
  kateri_dob date,
  lyman_gross_monthly numeric,
  lyman_net_monthly numeric,
  kateri_gross_monthly numeric,
  kateri_net_monthly numeric,
  household_net_monthly numeric,
  net_pay_effective_from date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_profile TO authenticated;
GRANT ALL ON public.household_profile TO service_role;
ALTER TABLE public.household_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view profile" ON public.household_profile FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members insert profile" ON public.household_profile FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members update profile" ON public.household_profile FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id)) WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE TRIGGER household_profile_updated BEFORE UPDATE ON public.household_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.household_profile (household_id, lyman_dob, kateri_dob, lyman_gross_monthly, lyman_net_monthly, household_net_monthly, net_pay_effective_from)
VALUES ('22b0f75a-82f2-4b56-85b9-1db72b95da1b', '1967-06-25', '1970-08-25', 5911.67, 4250.02, 4363.00, '2026-10-01');