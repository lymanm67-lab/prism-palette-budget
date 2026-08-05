CREATE TABLE public.fdn_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  foundation_name text NOT NULL DEFAULT 'Dr. Lyman A. Montgomery Family Foundation',
  tagline text,
  mission text,
  vision text,
  core_values jsonb NOT NULL DEFAULT '[]'::jsonb,
  legacy_statement text,
  founding_year integer NOT NULL DEFAULT 2027,
  endowment_target numeric NOT NULL DEFAULT 1000000,
  endowment_current numeric NOT NULL DEFAULT 0,
  annual_grant_budget numeric NOT NULL DEFAULT 25000,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fdn_pillars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  focus_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  annual_budget numeric NOT NULL DEFAULT 0,
  target_beneficiaries integer NOT NULL DEFAULT 0,
  actual_beneficiaries integer NOT NULL DEFAULT 0,
  kpis jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'planned',
  color text NOT NULL DEFAULT 'text-prism-teal',
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fdn_initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  pillar_id uuid REFERENCES public.fdn_pillars(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  budget numeric NOT NULL DEFAULT 0,
  spent numeric NOT NULL DEFAULT 0,
  target_beneficiaries integer NOT NULL DEFAULT 0,
  actual_beneficiaries integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'idea',
  lead_name text,
  start_date date,
  end_date date,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fdn_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  name text NOT NULL,
  organization text,
  role text,
  category text NOT NULL DEFAULT 'partner',
  influence integer NOT NULL DEFAULT 3,
  strength integer NOT NULL DEFAULT 3,
  email text,
  phone text,
  notes text,
  last_contact_at date,
  next_touch_at date,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fdn_roadmap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  year integer NOT NULL,
  phase_label text,
  title text NOT NULL,
  description text,
  pillar_id uuid REFERENCES public.fdn_pillars(id) ON DELETE SET NULL,
  target_amount numeric NOT NULL DEFAULT 0,
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'planned',
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fdn_legacy_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  title text NOT NULL,
  node_type text NOT NULL DEFAULT 'value',
  generation text NOT NULL DEFAULT 'g1',
  description text,
  linked_value text,
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_settings TO authenticated;
GRANT ALL ON public.fdn_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_pillars TO authenticated;
GRANT ALL ON public.fdn_pillars TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_initiatives TO authenticated;
GRANT ALL ON public.fdn_initiatives TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_relationships TO authenticated;
GRANT ALL ON public.fdn_relationships TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_roadmap TO authenticated;
GRANT ALL ON public.fdn_roadmap TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_legacy_nodes TO authenticated;
GRANT ALL ON public.fdn_legacy_nodes TO service_role;

ALTER TABLE public.fdn_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdn_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdn_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdn_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdn_roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdn_legacy_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members manage fdn_settings" ON public.fdn_settings FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members manage fdn_pillars" ON public.fdn_pillars FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members manage fdn_initiatives" ON public.fdn_initiatives FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members manage fdn_relationships" ON public.fdn_relationships FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members manage fdn_roadmap" ON public.fdn_roadmap FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members manage fdn_legacy_nodes" ON public.fdn_legacy_nodes FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_fdn_pillars_household ON public.fdn_pillars(household_id);
CREATE INDEX idx_fdn_initiatives_household ON public.fdn_initiatives(household_id);
CREATE INDEX idx_fdn_relationships_household ON public.fdn_relationships(household_id);
CREATE INDEX idx_fdn_roadmap_household ON public.fdn_roadmap(household_id);
CREATE INDEX idx_fdn_legacy_nodes_household ON public.fdn_legacy_nodes(household_id);

CREATE TRIGGER trg_fdn_settings_updated BEFORE UPDATE ON public.fdn_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fdn_pillars_updated BEFORE UPDATE ON public.fdn_pillars FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fdn_initiatives_updated BEFORE UPDATE ON public.fdn_initiatives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fdn_relationships_updated BEFORE UPDATE ON public.fdn_relationships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fdn_roadmap_updated BEFORE UPDATE ON public.fdn_roadmap FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fdn_legacy_nodes_updated BEFORE UPDATE ON public.fdn_legacy_nodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();