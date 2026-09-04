ALTER TABLE public.debt_items
  ADD COLUMN IF NOT EXISTS balance_as_of date,
  ADD COLUMN IF NOT EXISTS payment_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

UPDATE public.debt_items SET balance_as_of = CURRENT_DATE WHERE balance_as_of IS NULL;