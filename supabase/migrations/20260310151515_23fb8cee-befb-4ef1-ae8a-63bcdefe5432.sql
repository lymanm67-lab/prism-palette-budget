CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_provider_id_unique 
ON public.transactions (household_id, provider_transaction_id) 
WHERE provider_transaction_id IS NOT NULL;