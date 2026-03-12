
CREATE TABLE public.credit_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  bureau text NOT NULL DEFAULT 'Equifax',
  account_name text NOT NULL,
  account_number text,
  account_type text NOT NULL DEFAULT 'Revolving',
  account_status text NOT NULL DEFAULT 'Open',
  balance numeric NOT NULL DEFAULT 0,
  credit_limit numeric,
  monthly_payment numeric,
  payment_history text,
  date_opened date,
  date_closed date,
  date_of_first_delinquency date,
  high_balance numeric,
  terms text,
  responsibility text DEFAULT 'Individual',
  remarks_codes text,
  dispute_status text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view credit accounts" ON public.credit_accounts
  FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert credit accounts" ON public.credit_accounts
  FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can update credit accounts" ON public.credit_accounts
  FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete credit accounts" ON public.credit_accounts
  FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));
