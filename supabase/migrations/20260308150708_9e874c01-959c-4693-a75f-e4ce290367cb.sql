
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_household_merchant_unique UNIQUE (household_id, merchant);
