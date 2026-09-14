CREATE TABLE public.se_practice_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  market_read TEXT,
  regime_note TEXT,
  candidates_reviewed INTEGER NOT NULL DEFAULT 0,
  trades_qualified INTEGER NOT NULL DEFAULT 0,
  trades_rejected INTEGER NOT NULL DEFAULT 0,
  trades_executed INTEGER NOT NULL DEFAULT 0,
  best_skip_symbol TEXT,
  best_skip_reason TEXT,
  rule_violations TEXT,
  lessons_learned TEXT,
  notes TEXT,
  training_week INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_practice_sessions TO authenticated;
GRANT ALL ON public.se_practice_sessions TO service_role;
ALTER TABLE public.se_practice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage practice sessions"
  ON public.se_practice_sessions FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_se_practice_sessions_updated BEFORE UPDATE ON public.se_practice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_se_practice_sessions_household_date ON public.se_practice_sessions (household_id, session_date DESC);

CREATE TABLE public.se_execution_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  trade_plan_id UUID,
  paper_trade_id UUID,
  practice_session_id UUID,
  symbol TEXT NOT NULL,
  setup_type TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  entry_zone_low NUMERIC,
  entry_zone_high NUMERIC,
  planned_entry NUMERIC NOT NULL,
  planned_stop NUMERIC NOT NULL,
  planned_target NUMERIC,
  risk_per_share NUMERIC,
  max_dollar_risk NUMERIC,
  approved_shares INTEGER,
  position_value NUMERIC,
  potential_reward NUMERIC,
  reward_risk NUMERIC,
  training_capital NUMERIC,
  risk_pct NUMERIC,
  expected_hold TEXT,
  readiness_score INTEGER,
  signal TEXT,
  bias_direction TEXT,
  bias_confidence TEXT,
  bias_probability NUMERIC,
  event_risk_band TEXT,
  earnings_note TEXT,
  timeframe_daily TEXT,
  timeframe_h4 TEXT,
  timeframe_h1 TEXT,
  timeframe_weekly TEXT,
  timeframe_m15 TEXT,
  handoff_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  training_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  actual_entry NUMERIC,
  actual_shares INTEGER,
  actual_stop NUMERIC,
  actual_target NUMERIC,
  order_type TEXT,
  execution_time TEXT,
  slippage NUMERIC,
  variance_band TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_execution_tickets TO authenticated;
GRANT ALL ON public.se_execution_tickets TO service_role;
ALTER TABLE public.se_execution_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage execution tickets"
  ON public.se_execution_tickets FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_se_execution_tickets_updated BEFORE UPDATE ON public.se_execution_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_se_execution_tickets_household ON public.se_execution_tickets (household_id, created_at DESC);

CREATE TABLE public.se_target_modifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  paper_trade_id UUID NOT NULL,
  original_target NUMERIC,
  new_target NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  updated_reward_risk NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_target_modifications TO authenticated;
GRANT ALL ON public.se_target_modifications TO service_role;
ALTER TABLE public.se_target_modifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage target changes"
  ON public.se_target_modifications FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE INDEX idx_se_target_mods_trade ON public.se_target_modifications (paper_trade_id, created_at DESC);

ALTER TABLE public.se_paper_trades
  ADD COLUMN IF NOT EXISTS planned_entry NUMERIC,
  ADD COLUMN IF NOT EXISTS approved_shares INTEGER,
  ADD COLUMN IF NOT EXISTS order_type TEXT,
  ADD COLUMN IF NOT EXISTS execution_time TEXT,
  ADD COLUMN IF NOT EXISTS exit_time TEXT,
  ADD COLUMN IF NOT EXISTS actual_target NUMERIC,
  ADD COLUMN IF NOT EXISTS variance_band TEXT,
  ADD COLUMN IF NOT EXISTS max_favorable_excursion NUMERIC,
  ADD COLUMN IF NOT EXISTS max_adverse_excursion NUMERIC,
  ADD COLUMN IF NOT EXISTS execution_ticket_id UUID,
  ADD COLUMN IF NOT EXISTS practice_session_id UUID;