
ALTER TABLE public.credit_accounts
  ADD COLUMN IF NOT EXISTS statement_close_day smallint,
  ADD COLUMN IF NOT EXISTS due_day smallint;

CREATE TABLE IF NOT EXISTS public.goodwill_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  credit_account_id uuid REFERENCES public.credit_accounts(id) ON DELETE SET NULL,
  campaign_type text NOT NULL DEFAULT 'goodwill',
  creditor_name text NOT NULL,
  executive_name text,
  executive_title text,
  contact_method text,
  contact_email text,
  attempt_number integer NOT NULL DEFAULT 1,
  sent_date date,
  followup_due_date date,
  response_date date,
  response_type text,
  response_notes text,
  offer_amount numeric,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goodwill_campaigns TO authenticated;
GRANT ALL ON public.goodwill_campaigns TO service_role;
ALTER TABLE public.goodwill_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hh members view gw" ON public.goodwill_campaigns FOR SELECT
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hh members insert gw" ON public.goodwill_campaigns FOR INSERT
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hh members update gw" ON public.goodwill_campaigns FOR UPDATE
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hh members delete gw" ON public.goodwill_campaigns FOR DELETE
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER trg_goodwill_updated_at BEFORE UPDATE ON public.goodwill_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
