-- 1. Gift & funding ledger
CREATE TABLE public.fdn_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  donor_name text NOT NULL,
  donor_type text NOT NULL DEFAULT 'individual',
  gift_type text NOT NULL DEFAULT 'cash',
  amount numeric NOT NULL DEFAULT 0,
  gift_date date NOT NULL DEFAULT CURRENT_DATE,
  pledge_total numeric NOT NULL DEFAULT 0,
  pledge_balance numeric NOT NULL DEFAULT 0,
  is_restricted boolean NOT NULL DEFAULT false,
  restriction_note text,
  pillar_id uuid REFERENCES public.fdn_pillars(id) ON DELETE SET NULL,
  acknowledged_at date,
  receipt_sent boolean NOT NULL DEFAULT false,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_gifts TO authenticated;
GRANT ALL ON public.fdn_gifts TO service_role;
ALTER TABLE public.fdn_gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household members manage fdn_gifts" ON public.fdn_gifts FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_fdn_gifts_updated BEFORE UPDATE ON public.fdn_gifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Endowment investments
CREATE TABLE public.fdn_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  asset_class text NOT NULL DEFAULT 'equity',
  market_value numeric NOT NULL DEFAULT 0,
  cost_basis numeric NOT NULL DEFAULT 0,
  income_yield numeric NOT NULL DEFAULT 0,
  target_allocation_pct numeric NOT NULL DEFAULT 0,
  custodian text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_investments TO authenticated;
GRANT ALL ON public.fdn_investments TO service_role;
ALTER TABLE public.fdn_investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household members manage fdn_investments" ON public.fdn_investments FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_fdn_investments_updated BEFORE UPDATE ON public.fdn_investments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Governance records
CREATE TABLE public.fdn_governance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  record_type text NOT NULL DEFAULT 'board_member',
  name text NOT NULL,
  role text,
  committee text,
  email text,
  phone text,
  term_start date,
  term_end date,
  meeting_date date,
  attendees text,
  decisions text,
  status text NOT NULL DEFAULT 'active',
  is_independent boolean NOT NULL DEFAULT false,
  conflict_disclosed boolean NOT NULL DEFAULT false,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_governance TO authenticated;
GRANT ALL ON public.fdn_governance TO service_role;
ALTER TABLE public.fdn_governance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household members manage fdn_governance" ON public.fdn_governance FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_fdn_governance_updated BEFORE UPDATE ON public.fdn_governance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Compliance tracker
CREATE TABLE public.fdn_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  item text NOT NULL,
  category text NOT NULL DEFAULT 'filing',
  authority text,
  frequency text NOT NULL DEFAULT 'annual',
  due_date date,
  completed_at date,
  status text NOT NULL DEFAULT 'not_started',
  owner text,
  reference_url text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_compliance TO authenticated;
GRANT ALL ON public.fdn_compliance TO service_role;
ALTER TABLE public.fdn_compliance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household members manage fdn_compliance" ON public.fdn_compliance FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_fdn_compliance_updated BEFORE UPDATE ON public.fdn_compliance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Impact metrics
CREATE TABLE public.fdn_impact_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  pillar_id uuid REFERENCES public.fdn_pillars(id) ON DELETE SET NULL,
  metric_name text NOT NULL,
  unit text NOT NULL DEFAULT 'people',
  baseline numeric NOT NULL DEFAULT 0,
  target numeric NOT NULL DEFAULT 0,
  actual numeric NOT NULL DEFAULT 0,
  period text NOT NULL DEFAULT 'annual',
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_impact_metrics TO authenticated;
GRANT ALL ON public.fdn_impact_metrics TO service_role;
ALTER TABLE public.fdn_impact_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household members manage fdn_impact_metrics" ON public.fdn_impact_metrics FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_fdn_impact_metrics_updated BEFORE UPDATE ON public.fdn_impact_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Succession plan
CREATE TABLE public.fdn_succession (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  role_title text NOT NULL,
  current_holder text,
  successor_name text,
  generation text NOT NULL DEFAULT 'g2',
  readiness integer NOT NULL DEFAULT 1,
  training_plan text,
  target_transition_date date,
  status text NOT NULL DEFAULT 'identified',
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_succession TO authenticated;
GRANT ALL ON public.fdn_succession TO service_role;
ALTER TABLE public.fdn_succession ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household members manage fdn_succession" ON public.fdn_succession FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_fdn_succession_updated BEFORE UPDATE ON public.fdn_succession FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Document vault
CREATE TABLE public.fdn_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title text NOT NULL,
  doc_category text NOT NULL DEFAULT 'formation',
  file_path text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  expires_at date,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fdn_documents TO authenticated;
GRANT ALL ON public.fdn_documents TO service_role;
ALTER TABLE public.fdn_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household members manage fdn_documents" ON public.fdn_documents FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_fdn_documents_updated BEFORE UPDATE ON public.fdn_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();