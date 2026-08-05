ALTER TABLE public.fdn_documents
  ADD COLUMN IF NOT EXISTS ocr_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ocr_text text,
  ADD COLUMN IF NOT EXISTS ocr_at timestamptz,
  ADD COLUMN IF NOT EXISTS ocr_error text,
  ADD COLUMN IF NOT EXISTS page_count integer,
  ADD COLUMN IF NOT EXISTS extracted jsonb;

ALTER TABLE public.fdn_documents
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(file_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(ocr_text, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS fdn_documents_search_idx
  ON public.fdn_documents USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS fdn_documents_household_idx
  ON public.fdn_documents (household_id) WHERE deleted_at IS NULL;