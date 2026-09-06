ALTER TABLE public.recurring_transactions ADD COLUMN pause_months text[] DEFAULT '{}';

COMMENT ON COLUMN public.recurring_transactions.pause_months IS 'ISO-month strings (YYYY-MM) when this recurring charge is paused and should not count.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_transactions TO authenticated;
GRANT ALL ON public.recurring_transactions TO service_role;