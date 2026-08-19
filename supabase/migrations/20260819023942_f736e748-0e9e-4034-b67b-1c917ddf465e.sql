CREATE TABLE public.ltc_plan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL UNIQUE REFERENCES public.households(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ltc_plan TO authenticated;
GRANT ALL ON public.ltc_plan TO service_role;
ALTER TABLE public.ltc_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage ltc plan" ON public.ltc_plan FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER update_ltc_plan_updated_at BEFORE UPDATE ON public.ltc_plan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ltc_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other',
  carrier TEXT,
  product TEXT,
  agent TEXT,
  quote_date DATE,
  monthly_premium NUMERIC,
  monthly_benefit NUMERIC,
  inflation_pct NUMERIC,
  notes TEXT,
  file_path TEXT,
  file_name TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ltc_documents TO authenticated;
GRANT ALL ON public.ltc_documents TO service_role;
ALTER TABLE public.ltc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage ltc documents" ON public.ltc_documents FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER update_ltc_documents_updated_at BEFORE UPDATE ON public.ltc_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_ltc_documents_household ON public.ltc_documents(household_id);

CREATE POLICY "Household members read ltc files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ltc-documents' AND public.is_household_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "Household members upload ltc files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ltc-documents' AND public.is_household_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "Household members delete ltc files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ltc-documents' AND public.is_household_member(auth.uid(), ((storage.foldername(name))[1])::uuid));