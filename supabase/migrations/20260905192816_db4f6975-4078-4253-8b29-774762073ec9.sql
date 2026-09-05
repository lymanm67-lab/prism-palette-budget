ALTER TABLE public.freed_cash_sources
  ADD COLUMN IF NOT EXISTS confidence text NOT NULL DEFAULT 'estimated',
  ADD COLUMN IF NOT EXISTS durability text NOT NULL DEFAULT 'permanent',
  ADD COLUMN IF NOT EXISTS expires_on date;

UPDATE public.freed_cash_sources
SET confidence = CASE WHEN verified_at IS NOT NULL THEN 'verified' ELSE 'estimated' END,
    durability = CASE WHEN is_temporary THEN 'temporary' ELSE 'permanent' END;

ALTER TABLE public.freed_cash_redirects
  ADD COLUMN IF NOT EXISTS executed_monthly numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_executed_on date;

UPDATE public.freed_cash_redirects
SET executed_monthly = monthly_amount
WHERE confirmed_moved = true AND executed_monthly = 0;