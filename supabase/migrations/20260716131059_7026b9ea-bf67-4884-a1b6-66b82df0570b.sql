-- ============ hp_projects ============
CREATE TABLE public.hp_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Home Purchase Plan',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_close_date DATE NOT NULL,
  target_price NUMERIC(12,2),
  max_monthly_payment NUMERIC(10,2),
  down_payment_target NUMERIC(12,2),
  loan_type_preference TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hp_projects TO authenticated;
GRANT ALL ON public.hp_projects TO service_role;
ALTER TABLE public.hp_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_projects household access" ON public.hp_projects FOR ALL
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_hp_projects_updated BEFORE UPDATE ON public.hp_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX hp_projects_household_idx ON public.hp_projects(household_id) WHERE deleted_at IS NULL;

-- ============ hp_milestones ============
CREATE TABLE public.hp_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.hp_projects(id) ON DELETE CASCADE,
  household_id UUID NOT NULL,
  month_index INT NOT NULL,
  month_label TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  completion_pct INT NOT NULL DEFAULT 0,
  dependencies UUID[] NOT NULL DEFAULT '{}',
  due_date DATE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hp_milestones TO authenticated;
GRANT ALL ON public.hp_milestones TO service_role;
ALTER TABLE public.hp_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_milestones household access" ON public.hp_milestones FOR ALL
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_hp_milestones_updated BEFORE UPDATE ON public.hp_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX hp_milestones_project_idx ON public.hp_milestones(project_id, month_index) WHERE deleted_at IS NULL;

-- ============ hp_tasks ============
CREATE TABLE public.hp_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_id UUID NOT NULL REFERENCES public.hp_milestones(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  household_id UUID NOT NULL,
  week_index INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  estimated_hours NUMERIC(5,2),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hp_tasks TO authenticated;
GRANT ALL ON public.hp_tasks TO service_role;
ALTER TABLE public.hp_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_tasks household access" ON public.hp_tasks FOR ALL
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_hp_tasks_updated BEFORE UPDATE ON public.hp_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX hp_tasks_milestone_idx ON public.hp_tasks(milestone_id, week_index) WHERE deleted_at IS NULL;
CREATE INDEX hp_tasks_project_idx ON public.hp_tasks(project_id) WHERE deleted_at IS NULL;

-- ============ hp_documents ============
CREATE TABLE public.hp_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.hp_projects(id) ON DELETE CASCADE,
  household_id UUID NOT NULL,
  doc_type TEXT NOT NULL,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'missing',
  storage_path TEXT,
  expiration_date DATE,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hp_documents TO authenticated;
GRANT ALL ON public.hp_documents TO service_role;
ALTER TABLE public.hp_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_documents household access" ON public.hp_documents FOR ALL
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_hp_documents_updated BEFORE UPDATE ON public.hp_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX hp_documents_project_idx ON public.hp_documents(project_id) WHERE deleted_at IS NULL;

-- ============ hp_risks ============
CREATE TABLE public.hp_risks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.hp_projects(id) ON DELETE CASCADE,
  household_id UUID NOT NULL,
  title TEXT NOT NULL,
  probability TEXT NOT NULL DEFAULT 'medium',
  impact TEXT NOT NULL DEFAULT 'medium',
  mitigation TEXT,
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hp_risks TO authenticated;
GRANT ALL ON public.hp_risks TO service_role;
ALTER TABLE public.hp_risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_risks household access" ON public.hp_risks FOR ALL
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_hp_risks_updated BEFORE UPDATE ON public.hp_risks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX hp_risks_project_idx ON public.hp_risks(project_id) WHERE deleted_at IS NULL;

-- ============ hp_rules ============
CREATE TABLE public.hp_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.hp_projects(id) ON DELETE CASCADE,
  household_id UUID NOT NULL,
  rule_type TEXT NOT NULL,
  label TEXT NOT NULL,
  value_numeric NUMERIC(14,2),
  value_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hp_rules TO authenticated;
GRANT ALL ON public.hp_rules TO service_role;
ALTER TABLE public.hp_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_rules household access" ON public.hp_rules FOR ALL
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_hp_rules_updated BEFORE UPDATE ON public.hp_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX hp_rules_project_idx ON public.hp_rules(project_id) WHERE deleted_at IS NULL;

-- ============ hp_scenarios ============
CREATE TABLE public.hp_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.hp_projects(id) ON DELETE CASCADE,
  household_id UUID NOT NULL,
  name TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hp_scenarios TO authenticated;
GRANT ALL ON public.hp_scenarios TO service_role;
ALTER TABLE public.hp_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_scenarios household access" ON public.hp_scenarios FOR ALL
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_hp_scenarios_updated BEFORE UPDATE ON public.hp_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX hp_scenarios_project_idx ON public.hp_scenarios(project_id) WHERE deleted_at IS NULL;

-- ============ hp_coach_narratives ============
CREATE TABLE public.hp_coach_narratives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.hp_projects(id) ON DELETE CASCADE,
  household_id UUID NOT NULL,
  section_key TEXT NOT NULL,
  month_index INT,
  content_md TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hp_coach_narratives TO authenticated;
GRANT ALL ON public.hp_coach_narratives TO service_role;
ALTER TABLE public.hp_coach_narratives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_coach household access" ON public.hp_coach_narratives FOR ALL
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_hp_coach_updated BEFORE UPDATE ON public.hp_coach_narratives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX hp_coach_lookup_idx ON public.hp_coach_narratives(project_id, section_key, month_index);

-- ============ hp_notes ============
CREATE TABLE public.hp_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.hp_projects(id) ON DELETE CASCADE,
  household_id UUID NOT NULL,
  month_index INT,
  category TEXT NOT NULL DEFAULT 'journal',
  title TEXT,
  body TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hp_notes TO authenticated;
GRANT ALL ON public.hp_notes TO service_role;
ALTER TABLE public.hp_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_notes household access" ON public.hp_notes FOR ALL
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_hp_notes_updated BEFORE UPDATE ON public.hp_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX hp_notes_project_idx ON public.hp_notes(project_id, month_index) WHERE deleted_at IS NULL;

-- ============ hp_worksheets ============
CREATE TABLE public.hp_worksheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.hp_projects(id) ON DELETE CASCADE,
  household_id UUID NOT NULL,
  worksheet_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hp_worksheets TO authenticated;
GRANT ALL ON public.hp_worksheets TO service_role;
ALTER TABLE public.hp_worksheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_worksheets household access" ON public.hp_worksheets FOR ALL
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_hp_worksheets_updated BEFORE UPDATE ON public.hp_worksheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX hp_worksheets_unique_idx ON public.hp_worksheets(project_id, worksheet_type) WHERE deleted_at IS NULL;