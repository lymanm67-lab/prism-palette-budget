SELECT cron.schedule(
  'scheduled-duplicate-detector',
  '17 */6 * * *',
  $$
  WITH clusters AS (
    SELECT t.household_id, t.date, abs(t.amount) AS amt,
           array_agg(t.id ORDER BY t.created_at) AS ids
    FROM public.transactions t
    WHERE t.deleted_at IS NULL
      AND t.is_transfer = false
      AND t.amount < 0
      AND t.date >= current_date - interval '30 days'
    GROUP BY t.household_id, t.date, abs(t.amount)
    HAVING count(*) > 1
  ),
  fresh AS (
    SELECT c.household_id, c.ids
    FROM clusters c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.categorization_audit a
      WHERE a.rule_key = 'scheduled-duplicate-scan'
        AND a.transaction_id = ANY(c.ids)
    )
    LIMIT 25
  )
  INSERT INTO public.categorization_audit
    (household_id, transaction_id, source, rule_key, rule_name, before_merchant, after_merchant, txn_date, amount)
  SELECT f.household_id, t.id, 'duplicate-scheduler', 'scheduled-duplicate-scan',
         'Scheduled duplicate scan — review cluster', t.merchant, t.merchant, t.date, t.amount
  FROM fresh f
  JOIN public.transactions t ON t.id = ANY(f.ids);
  $$
);