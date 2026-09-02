-- ============ Prism Five Investment Roles ============

CREATE TABLE public.inv_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  drift_band_pct numeric NOT NULL DEFAULT 5,
  conviction_catalyst_warn_pct numeric NOT NULL DEFAULT 20,
  legacy_goal_amount numeric NOT NULL DEFAULT 4000000,
  legacy_goal_age integer NOT NULL DEFAULT 85,
  default_dividend_instruction text NOT NULL DEFAULT 'reinvest',
  emergency_floor_override numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_settings TO authenticated;
GRANT ALL ON public.inv_settings TO service_role;
ALTER TABLE public.inv_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_settings household" ON public.inv_settings FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_inv_settings_updated BEFORE UPDATE ON public.inv_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inv_role_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  role text NOT NULL,
  target_pct numeric NOT NULL DEFAULT 0,
  max_pct numeric,
  benchmark_ticker text,
  benchmark_label text,
  expected_return_pct numeric NOT NULL DEFAULT 8,
  volatility_pct numeric NOT NULL DEFAULT 15,
  risk_bucket text NOT NULL DEFAULT 'foundation',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_role_targets TO authenticated;
GRANT ALL ON public.inv_role_targets TO service_role;
ALTER TABLE public.inv_role_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_role_targets household" ON public.inv_role_targets FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_inv_role_targets_updated BEFORE UPDATE ON public.inv_role_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inv_role_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  role text NOT NULL,
  ticker text NOT NULL,
  name text,
  security_type text NOT NULL DEFAULT 'unverified',
  verified boolean NOT NULL DEFAULT false,
  account_type text NOT NULL DEFAULT 'taxable',
  account_label text,
  account_id uuid,
  shares numeric NOT NULL DEFAULT 0,
  current_price numeric,
  price_updated_at timestamptz,
  cost_basis numeric NOT NULL DEFAULT 0,
  avg_price numeric,
  entry_date date,
  entry_price numeric,
  dividend_income_ytd numeric NOT NULL DEFAULT 0,
  dividend_instruction text NOT NULL DEFAULT 'reinvest',
  target_pct numeric,
  max_pct numeric,
  thesis text,
  expected_opportunity text,
  expected_holding_period text,
  review_date date,
  invalidation text,
  catalyst text,
  catalyst_category text,
  catalyst_why text,
  risk_level text,
  exit_criteria text,
  status text NOT NULL DEFAULT 'hold',
  thesis_state text NOT NULL DEFAULT 'intact',
  catalyst_state text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_role_positions TO authenticated;
GRANT ALL ON public.inv_role_positions TO service_role;
ALTER TABLE public.inv_role_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_role_positions household" ON public.inv_role_positions FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_inv_role_positions_updated BEFORE UPDATE ON public.inv_role_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_inv_role_positions_hh ON public.inv_role_positions (household_id) WHERE deleted_at IS NULL;

CREATE TABLE public.inv_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  position_id uuid REFERENCES public.inv_role_positions(id) ON DELETE SET NULL,
  role text,
  account_type text NOT NULL DEFAULT 'taxable',
  amount numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'monthly_cash_flow',
  contributed_on date NOT NULL DEFAULT CURRENT_DATE,
  is_transfer boolean NOT NULL DEFAULT false,
  is_employer boolean NOT NULL DEFAULT false,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_contributions TO authenticated;
GRANT ALL ON public.inv_contributions TO service_role;
ALTER TABLE public.inv_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_contributions household" ON public.inv_contributions FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_inv_contributions_updated BEFORE UPDATE ON public.inv_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inv_securities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  name text,
  security_type text NOT NULL DEFAULT 'unverified',
  asset_class text,
  sector text,
  industry text,
  country text,
  expense_ratio numeric,
  dividend_yield numeric,
  volatility_pct numeric,
  price numeric,
  price_updated_at timestamptz,
  verified boolean NOT NULL DEFAULT false,
  source text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, ticker)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_securities TO authenticated;
GRANT ALL ON public.inv_securities TO service_role;
ALTER TABLE public.inv_securities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_securities household" ON public.inv_securities FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_inv_securities_updated BEFORE UPDATE ON public.inv_securities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inv_security_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  holding_symbol text,
  holding_name text NOT NULL,
  weight_pct numeric NOT NULL DEFAULT 0,
  sector text,
  industry text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_security_holdings TO authenticated;
GRANT ALL ON public.inv_security_holdings TO service_role;
ALTER TABLE public.inv_security_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_security_holdings household" ON public.inv_security_holdings FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE INDEX idx_inv_security_holdings_ticker ON public.inv_security_holdings (household_id, ticker);

CREATE TABLE public.inv_concentration_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  scope text NOT NULL,
  scope_key text,
  max_pct numeric NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_concentration_limits TO authenticated;
GRANT ALL ON public.inv_concentration_limits TO service_role;
ALTER TABLE public.inv_concentration_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_concentration_limits household" ON public.inv_concentration_limits FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_inv_conc_limits_updated BEFORE UPDATE ON public.inv_concentration_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inv_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  decided_on date NOT NULL DEFAULT CURRENT_DATE,
  action text NOT NULL,
  role text,
  ticker text,
  amount numeric,
  reason text,
  expected_outcome text,
  risk_considered text,
  review_date date,
  actual_outcome text,
  outcome_recorded_on date,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_decisions TO authenticated;
GRANT ALL ON public.inv_decisions TO service_role;
ALTER TABLE public.inv_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_decisions household" ON public.inv_decisions FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_inv_decisions_updated BEFORE UPDATE ON public.inv_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inv_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  review_type text NOT NULL DEFAULT 'monthly',
  period_label text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, review_type, period_label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_reviews TO authenticated;
GRANT ALL ON public.inv_reviews TO service_role;
ALTER TABLE public.inv_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_reviews household" ON public.inv_reviews FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_inv_reviews_updated BEFORE UPDATE ON public.inv_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inv_watchlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  name text,
  security_type text NOT NULL DEFAULT 'unverified',
  verified boolean NOT NULL DEFAULT false,
  candidate_role text NOT NULL DEFAULT 'CORE',
  thesis text,
  desired_entry_price numeric,
  current_price numeric,
  price_updated_at timestamptz,
  catalyst text,
  research_notes text,
  review_date date,
  decision_status text NOT NULL DEFAULT 'researching',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_watchlist_items TO authenticated;
GRANT ALL ON public.inv_watchlist_items TO service_role;
ALTER TABLE public.inv_watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_watchlist_items household" ON public.inv_watchlist_items FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_inv_watchlist_updated BEFORE UPDATE ON public.inv_watchlist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inv_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name text NOT NULL,
  allocations jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_scenarios TO authenticated;
GRANT ALL ON public.inv_scenarios TO service_role;
ALTER TABLE public.inv_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_scenarios household" ON public.inv_scenarios FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_inv_scenarios_updated BEFORE UPDATE ON public.inv_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
