CREATE TABLE public.fdn_binder_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  doc_code TEXT NOT NULL,
  title TEXT NOT NULL,
  purpose TEXT,
  body TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  prepared_by TEXT,
  reviewed_by TEXT,
  approved_on DATE,
  effective_on DATE,
  review_due_on DATE,
  cross_refs TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  supersedes_id UUID REFERENCES public.fdn_binder_documents(id) ON DELETE SET NULL,
  notes TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_binder_documents TO authenticated;
GRANT ALL ON public.fdn_binder_documents TO service_role;

ALTER TABLE public.fdn_binder_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members manage binder documents"
  ON public.fdn_binder_documents FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE UNIQUE INDEX fdn_binder_documents_code_version_uniq
  ON public.fdn_binder_documents (household_id, doc_code, version);
CREATE INDEX fdn_binder_documents_section_idx
  ON public.fdn_binder_documents (household_id, section, sort_order);

CREATE TRIGGER trg_fdn_binder_documents_updated
  BEFORE UPDATE ON public.fdn_binder_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();