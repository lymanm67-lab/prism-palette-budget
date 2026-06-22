ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

UPDATE public.subscriptions s
SET account_id = sub.account_id
FROM (
  SELECT DISTINCT ON (LOWER(TRIM(COALESCE(t.normalized_merchant, t.merchant))), t.household_id)
    LOWER(TRIM(COALESCE(t.normalized_merchant, t.merchant))) AS mkey,
    t.household_id,
    t.account_id
  FROM public.transactions t
  WHERE t.amount < 0 AND t.account_id IS NOT NULL
  ORDER BY LOWER(TRIM(COALESCE(t.normalized_merchant, t.merchant))), t.household_id, t.date DESC
) sub
WHERE s.account_id IS NULL
  AND s.household_id = sub.household_id
  AND LOWER(TRIM(COALESCE(s.normalized_merchant, s.merchant))) = sub.mkey;