DO $$ BEGIN
  CREATE TYPE public.money_purpose AS ENUM ('live','enjoy','build_wealth','eliminate_debt','business','payroll_deduction','employer_contribution');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS money_purpose public.money_purpose;
ALTER TABLE public.category_groups ADD COLUMN IF NOT EXISTS money_purpose public.money_purpose;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS money_purpose public.money_purpose;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS money_purpose_locked boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_categories_money_purpose ON public.categories (household_id, money_purpose);
CREATE INDEX IF NOT EXISTS idx_transactions_money_purpose ON public.transactions (household_id, money_purpose);