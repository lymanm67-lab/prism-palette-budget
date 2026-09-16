ALTER TABLE public.se_trade_plans
  ADD COLUMN IF NOT EXISTS execution_mode text,
  ADD COLUMN IF NOT EXISTS plan_state text,
  ADD COLUMN IF NOT EXISTS condition_mode text,
  ADD COLUMN IF NOT EXISTS entry_conditions jsonb,
  ADD COLUMN IF NOT EXISTS cancel_conditions jsonb,
  ADD COLUMN IF NOT EXISTS analysis_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS armed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_revalidated_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;