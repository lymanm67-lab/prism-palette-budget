CREATE TABLE public.loan_readiness_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  document_key text NOT NULL,
  document_label text NOT NULL,
  is_uploaded boolean NOT NULL DEFAULT false,
  notes text,
  uploaded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, document_key)
);

ALTER TABLE public.loan_readiness_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view loan readiness" ON public.loan_readiness_items
  FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert loan readiness" ON public.loan_readiness_items
  FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update loan readiness" ON public.loan_readiness_items
  FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete loan readiness" ON public.loan_readiness_items
  FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_loan_readiness_updated_at
  BEFORE UPDATE ON public.loan_readiness_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();