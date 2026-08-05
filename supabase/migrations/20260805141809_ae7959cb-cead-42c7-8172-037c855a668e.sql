ALTER TABLE public.health_medical_documents
  ADD COLUMN IF NOT EXISTS parse_status text,
  ADD COLUMN IF NOT EXISTS parsed_at timestamptz,
  ADD COLUMN IF NOT EXISTS parsed_summary jsonb;