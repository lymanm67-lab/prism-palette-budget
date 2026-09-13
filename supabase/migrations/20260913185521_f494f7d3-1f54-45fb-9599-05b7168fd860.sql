ALTER TABLE public.se_paper_trades
  ADD COLUMN IF NOT EXISTS event_risk_band TEXT,
  ADD COLUMN IF NOT EXISTS event_risk_score INTEGER,
  ADD COLUMN IF NOT EXISTS event_decision TEXT,
  ADD COLUMN IF NOT EXISTS bias_direction TEXT,
  ADD COLUMN IF NOT EXISTS bias_confidence TEXT,
  ADD COLUMN IF NOT EXISTS earnings_within_hold BOOLEAN,
  ADD COLUMN IF NOT EXISTS readiness_score INTEGER;

ALTER TABLE public.se_journal_entries
  ADD COLUMN IF NOT EXISTS event_risk_band TEXT,
  ADD COLUMN IF NOT EXISTS event_risk_score INTEGER,
  ADD COLUMN IF NOT EXISTS bias_direction TEXT,
  ADD COLUMN IF NOT EXISTS earnings_within_hold BOOLEAN,
  ADD COLUMN IF NOT EXISTS event_note TEXT;