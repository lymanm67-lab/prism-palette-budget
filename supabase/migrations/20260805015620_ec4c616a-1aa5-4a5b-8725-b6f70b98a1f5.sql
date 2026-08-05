CREATE TABLE public.health_preventive_care (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  care_type text NOT NULL DEFAULT 'screening',
  person text,
  provider text,
  frequency_months integer NOT NULL DEFAULT 12,
  last_completed_on date,
  next_due_on date,
  status text NOT NULL DEFAULT 'due',
  cost_estimate numeric NOT NULL DEFAULT 0,
  out_of_pocket numeric NOT NULL DEFAULT 0,
  covered_by_insurance boolean NOT NULL DEFAULT true,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_preventive_care TO authenticated;
GRANT ALL ON public.health_preventive_care TO service_role;
ALTER TABLE public.health_preventive_care ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hpc_select" ON public.health_preventive_care FOR SELECT TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hpc_insert" ON public.health_preventive_care FOR INSERT TO authenticated WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hpc_update" ON public.health_preventive_care FOR UPDATE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hpc_delete" ON public.health_preventive_care FOR DELETE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_hpc_updated BEFORE UPDATE ON public.health_preventive_care FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.health_medical_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title text NOT NULL,
  doc_type text NOT NULL DEFAULT 'lab_result',
  document_date date,
  provider text,
  person text,
  file_path text NOT NULL,
  file_name text,
  file_size integer,
  mime_type text,
  notes text,
  preventive_care_id uuid REFERENCES public.health_preventive_care(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_medical_documents TO authenticated;
GRANT ALL ON public.health_medical_documents TO service_role;
ALTER TABLE public.health_medical_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hmd_select" ON public.health_medical_documents FOR SELECT TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hmd_insert" ON public.health_medical_documents FOR INSERT TO authenticated WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hmd_update" ON public.health_medical_documents FOR UPDATE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "hmd_delete" ON public.health_medical_documents FOR DELETE TO authenticated USING (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_hmd_updated BEFORE UPDATE ON public.health_medical_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_hpc_household ON public.health_preventive_care(household_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_hmd_household ON public.health_medical_documents(household_id) WHERE deleted_at IS NULL;