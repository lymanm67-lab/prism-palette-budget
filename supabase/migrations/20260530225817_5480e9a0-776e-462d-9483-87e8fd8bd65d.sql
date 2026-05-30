
-- v9: Digital assets inventory for estate execution
CREATE TABLE public.digital_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  asset_type text NOT NULL DEFAULT 'account',
  name text NOT NULL,
  provider text,
  username text,
  recovery_notes text,
  beneficiary text,
  has_2fa boolean NOT NULL DEFAULT false,
  vault_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_assets TO authenticated;
GRANT ALL ON public.digital_assets TO service_role;
ALTER TABLE public.digital_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view digital assets" ON public.digital_assets FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can insert digital assets" ON public.digital_assets FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can update digital assets" ON public.digital_assets FOR UPDATE TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Members can delete digital assets" ON public.digital_assets FOR DELETE TO authenticated USING (is_household_member(auth.uid(), household_id));

-- v12: Log money rule executions so cron doesn't re-fire same rule
CREATE TABLE public.investment_rule_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  rule_id uuid NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'executed',
  notes text
);
GRANT SELECT, INSERT ON public.investment_rule_executions TO authenticated;
GRANT ALL ON public.investment_rule_executions TO service_role;
ALTER TABLE public.investment_rule_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view rule executions" ON public.investment_rule_executions FOR SELECT TO authenticated USING (is_household_member(auth.uid(), household_id));
CREATE POLICY "Service inserts rule executions" ON public.investment_rule_executions FOR INSERT TO authenticated WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE INDEX idx_digital_assets_household ON public.digital_assets(household_id);
CREATE INDEX idx_rule_exec_rule ON public.investment_rule_executions(rule_id);
