-- Settings: heat, sector, correlation, commission, circuit breakers
ALTER TABLE public.se_trading_settings
  ADD COLUMN IF NOT EXISTS max_sector_capital_exposure_pct numeric NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS max_sector_heat_pct numeric NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS correlation_lookback_days integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS correlation_moderate numeric NOT NULL DEFAULT 0.40,
  ADD COLUMN IF NOT EXISTS correlation_high numeric NOT NULL DEFAULT 0.60,
  ADD COLUMN IF NOT EXISTS correlation_very_high numeric NOT NULL DEFAULT 0.80,
  ADD COLUMN IF NOT EXISTS max_correlated_risk_pct numeric NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS commission_per_trade numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signal_max_age_days integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS breaker_consecutive_losses integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS breaker_daily_loss_limit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS breaker_weekly_loss_limit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS training_min_paper_trades integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS training_mode_enabled boolean NOT NULL DEFAULT false;

-- Sector snapshot on open trades so heat can group without a live lookup
ALTER TABLE public.se_paper_trades
  ADD COLUMN IF NOT EXISTS sector text,
  ADD COLUMN IF NOT EXISTS current_price numeric,
  ADD COLUMN IF NOT EXISTS planned_stop numeric,
  ADD COLUMN IF NOT EXISTS simulated_fill numeric,
  ADD COLUMN IF NOT EXISTS slippage numeric,
  ADD COLUMN IF NOT EXISTS gap_difference numeric,
  ADD COLUMN IF NOT EXISTS planned_loss numeric,
  ADD COLUMN IF NOT EXISTS actual_simulated_loss numeric,
  ADD COLUMN IF NOT EXISTS execution_score numeric,
  ADD COLUMN IF NOT EXISTS signal_quality text,
  ADD COLUMN IF NOT EXISTS outcome_class text,
  ADD COLUMN IF NOT EXISTS revalidated_at timestamptz;

-- Portfolio heat history
CREATE TABLE IF NOT EXISTS public.se_heat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  trading_capital numeric NOT NULL DEFAULT 0,
  open_risk numeric NOT NULL DEFAULT 0,
  original_risk numeric NOT NULL DEFAULT 0,
  locked_profit numeric NOT NULL DEFAULT 0,
  heat_pct numeric NOT NULL DEFAULT 0,
  max_heat_dollars numeric NOT NULL DEFAULT 0,
  invested_capital numeric NOT NULL DEFAULT 0,
  open_positions integer NOT NULL DEFAULT 0,
  sector_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_heat_history TO authenticated;
GRANT ALL ON public.se_heat_history TO service_role;
ALTER TABLE public.se_heat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage heat history" ON public.se_heat_history
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE INDEX IF NOT EXISTS idx_se_heat_history_hh ON public.se_heat_history(household_id, captured_at DESC);

-- Signal revalidation history
CREATE TABLE IF NOT EXISTS public.se_signal_revalidations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  symbol text NOT NULL,
  previous_signal text,
  new_signal text NOT NULL,
  previous_entry_low numeric,
  previous_entry_high numeric,
  new_entry_low numeric,
  new_entry_high numeric,
  current_price numeric,
  technical_score numeric,
  risk_score numeric,
  hybrid_score numeric,
  market_regime text,
  relative_strength text,
  portfolio_heat_pct numeric,
  correlation_risk text,
  reason text NOT NULL,
  triggers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_signal_revalidations TO authenticated;
GRANT ALL ON public.se_signal_revalidations TO service_role;
ALTER TABLE public.se_signal_revalidations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage revalidations" ON public.se_signal_revalidations
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE INDEX IF NOT EXISTS idx_se_reval_hh ON public.se_signal_revalidations(household_id, symbol, created_at DESC);

-- Immutable trade snapshots
CREATE TABLE IF NOT EXISTS public.se_trade_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  paper_trade_id uuid,
  symbol text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  signal_state text,
  hybrid_score numeric,
  technical_score numeric,
  quality_score numeric,
  risk_score numeric,
  market_regime text,
  relative_strength text,
  portfolio_heat_pct numeric,
  sector_heat_pct numeric,
  correlation_band text,
  stop_justification text,
  candle_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.se_trade_snapshots TO authenticated;
GRANT ALL ON public.se_trade_snapshots TO service_role;
ALTER TABLE public.se_trade_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members read snapshots" ON public.se_trade_snapshots
  FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members write snapshots" ON public.se_trade_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE INDEX IF NOT EXISTS idx_se_snapshots_hh ON public.se_trade_snapshots(household_id, captured_at DESC);

-- Daily pre-trade checklist
CREATE TABLE IF NOT EXISTS public.se_daily_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  checklist_date date NOT NULL DEFAULT CURRENT_DATE,
  market_condition_checked boolean NOT NULL DEFAULT false,
  heat_room_checked boolean NOT NULL DEFAULT false,
  earnings_checked boolean NOT NULL DEFAULT false,
  stop_defined boolean NOT NULL DEFAULT false,
  size_calculated boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, checklist_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_daily_checklists TO authenticated;
GRANT ALL ON public.se_daily_checklists TO service_role;
ALTER TABLE public.se_daily_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage checklists" ON public.se_daily_checklists
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_se_daily_checklists_updated BEFORE UPDATE ON public.se_daily_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Training progress
CREATE TABLE IF NOT EXISTS public.se_training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  week_number integer NOT NULL,
  charts_analyzed integer NOT NULL DEFAULT 0,
  candidates_built integer NOT NULL DEFAULT 0,
  setups_analyzed integer NOT NULL DEFAULT 0,
  paper_trades_taken integer NOT NULL DEFAULT 0,
  lessons_completed integer NOT NULL DEFAULT 0,
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, week_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_training_progress TO authenticated;
GRANT ALL ON public.se_training_progress TO service_role;
ALTER TABLE public.se_training_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage training progress" ON public.se_training_progress
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_se_training_progress_updated BEFORE UPDATE ON public.se_training_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Circuit breaker state
CREATE TABLE IF NOT EXISTS public.se_circuit_breaker_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'ACTIVE',
  reason text,
  triggered_at timestamptz,
  review_completed_at timestamptz,
  consecutive_losses integer NOT NULL DEFAULT 0,
  daily_loss numeric NOT NULL DEFAULT 0,
  weekly_loss numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_circuit_breaker_state TO authenticated;
GRANT ALL ON public.se_circuit_breaker_state TO service_role;
ALTER TABLE public.se_circuit_breaker_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage breaker state" ON public.se_circuit_breaker_state
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_se_breaker_updated BEFORE UPDATE ON public.se_circuit_breaker_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Weekly reviews
CREATE TABLE IF NOT EXISTS public.se_weekly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  week_start date NOT NULL,
  trades_taken integer NOT NULL DEFAULT 0,
  rule_following_pct numeric NOT NULL DEFAULT 0,
  execution_score numeric NOT NULL DEFAULT 0,
  best_skip_symbol text,
  best_skip_reason text,
  lesson_to_revisit text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_weekly_reviews TO authenticated;
GRANT ALL ON public.se_weekly_reviews TO service_role;
ALTER TABLE public.se_weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage weekly reviews" ON public.se_weekly_reviews
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_se_weekly_reviews_updated BEFORE UPDATE ON public.se_weekly_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();