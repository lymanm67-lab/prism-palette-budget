-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_household_date ON public.transactions(household_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_active ON public.transactions(household_id, deleted_at) WHERE deleted_at IS NULL;