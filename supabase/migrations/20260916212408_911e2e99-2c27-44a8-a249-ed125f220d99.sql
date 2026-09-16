ALTER TABLE public.se_paper_trades
  ADD COLUMN IF NOT EXISTS sector_heat_before numeric,
  ADD COLUMN IF NOT EXISTS sector_heat_after numeric,
  ADD COLUMN IF NOT EXISTS portfolio_heat_before numeric,
  ADD COLUMN IF NOT EXISTS portfolio_heat_after numeric,
  ADD COLUMN IF NOT EXISTS correlation_state text,
  ADD COLUMN IF NOT EXISTS exposure_family text,
  ADD COLUMN IF NOT EXISTS common_driver text,
  ADD COLUMN IF NOT EXISTS portfolio_fit text,
  ADD COLUMN IF NOT EXISTS fit_override_reason text;

ALTER TABLE public.se_trade_plans
  ADD COLUMN IF NOT EXISTS portfolio_fit text,
  ADD COLUMN IF NOT EXISTS portfolio_fit_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS fit_override_reason text;

ALTER TABLE public.se_trading_settings
  ADD COLUMN IF NOT EXISTS max_family_heat_pct numeric,
  ADD COLUMN IF NOT EXISTS log_fit_overrides boolean DEFAULT true;