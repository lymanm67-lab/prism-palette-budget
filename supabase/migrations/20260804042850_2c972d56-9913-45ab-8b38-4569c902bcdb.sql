ALTER TABLE public.investment_holdings
ADD COLUMN IF NOT EXISTS return_1yr_pct numeric,
ADD COLUMN IF NOT EXISTS return_ytd_pct numeric;

COMMENT ON COLUMN public.investment_holdings.return_1yr_pct IS 'Actual trailing 1-year return percentage';
COMMENT ON COLUMN public.investment_holdings.return_ytd_pct IS 'Actual year-to-date return percentage';

UPDATE public.investment_holdings
SET return_1yr_pct = 14.68, return_ytd_pct = 8.05
WHERE account_id = '3e7c9fa8-53cc-4ed5-90bf-cb15c0477f4c' AND symbol = 'VFIFX';

UPDATE public.investment_holdings
SET return_1yr_pct = 15.42, return_ytd_pct = 8.54
WHERE account_id = '4a1f0e2c-9b31-4d77-9a52-1c0f7b8e5a10' AND symbol = 'VFIFX';

UPDATE public.investment_holdings
SET return_1yr_pct = 15.50, return_ytd_pct = 8.64
WHERE account_id = '7dbe823a-089a-4129-b080-6a7e5877b47a' AND symbol = 'VFIFX';

UPDATE public.investment_plans
SET expected_return_pct = 14.81,
    notes = COALESCE(notes, '') || E'\n\nActual returns source: Fidelity workplace plan statements (2026-08-04). Weighted 1-year: 14.81%, weighted YTD: 8.14%. Holdings: IU Retirement Plan (57524) 14.68%/8.05%, IU TDA (51913) 15.42%/8.54%, IU 457(b) Supplemental (71301) 15.50%/8.64%.'
WHERE is_active = true;