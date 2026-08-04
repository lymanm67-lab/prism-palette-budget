ALTER TABLE public.investment_plans ADD COLUMN IF NOT EXISTS expense_ratio_pct numeric DEFAULT 0;

COMMENT ON COLUMN public.investment_plans.expense_ratio_pct IS 'Blended annual fund expense ratio as a decimal (e.g. 0.0008 = 0.08%)';