
-- Add cleanup-related columns to subscriptions table
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS usage_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS user_usage_override text,
  ADD COLUMN IF NOT EXISTS cancellation_difficulty text NOT NULL DEFAULT 'easy',
  ADD COLUMN IF NOT EXISTS cancellation_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancellation_confirmed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS savings_reallocated_to text,
  ADD COLUMN IF NOT EXISTS cancellation_notes text;

-- usage_status: active, suspected_unused, renewal_approaching, recently_increased
-- user_usage_override: still_using, no_longer_using, unsure
-- cancellation_difficulty: easy, moderate, hard
-- cancellation_status: not_started, requested, pending, canceled, still_active
-- savings_reallocated_to: savings_goal, debt_payoff, future_expenses, extra_cash
