
-- Table to store Plaid access tokens and item metadata
CREATE TABLE public.plaid_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  plaid_item_id TEXT NOT NULL UNIQUE,
  plaid_access_token TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  consent_expiration TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view plaid items" ON public.plaid_items FOR SELECT USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert plaid items" ON public.plaid_items FOR INSERT WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update plaid items" ON public.plaid_items FOR UPDATE USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete plaid items" ON public.plaid_items FOR DELETE USING (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER update_plaid_items_updated_at BEFORE UPDATE ON public.plaid_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
