ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS default_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_default_account ON public.categories(default_account_id);