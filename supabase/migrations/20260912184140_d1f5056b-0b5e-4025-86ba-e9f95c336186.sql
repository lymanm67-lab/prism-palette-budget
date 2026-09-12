ALTER TABLE public.se_trading_settings
  ADD COLUMN IF NOT EXISTS breaker_daily_loss_r numeric NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS breaker_weekly_loss_r numeric NOT NULL DEFAULT 5;

ALTER TABLE public.se_circuit_breaker_state
  ADD COLUMN IF NOT EXISTS daily_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS weekly_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS consecutive_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS consecutive_review_answers jsonb;