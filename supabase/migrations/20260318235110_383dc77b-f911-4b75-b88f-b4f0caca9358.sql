-- Create storage bucket for credit documents
INSERT INTO storage.buckets (id, name, public) VALUES ('credit-documents', 'credit-documents', false);

-- RLS policies for credit-documents bucket
CREATE POLICY "Authenticated users can upload credit docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'credit-documents');

CREATE POLICY "Users can view own credit docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'credit-documents');

CREATE POLICY "Users can delete own credit docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'credit-documents');

-- Metadata table to track saved documents
CREATE TABLE public.credit_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'credit_report',
  bureau TEXT,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  dispute_id UUID REFERENCES public.credit_disputes(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view credit documents"
ON public.credit_documents FOR SELECT TO authenticated
USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert credit documents"
ON public.credit_documents FOR INSERT TO authenticated
WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete credit documents"
ON public.credit_documents FOR DELETE TO authenticated
USING (is_household_member(auth.uid(), household_id));