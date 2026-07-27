ALTER TABLE public.investment_plans
  ADD COLUMN IF NOT EXISTS income_strategy text NOT NULL DEFAULT 'portfolio_draw';