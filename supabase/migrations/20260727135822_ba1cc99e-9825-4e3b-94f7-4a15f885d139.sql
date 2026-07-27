update public.spending_plans
set buckets = jsonb_set(buckets, '{wealthEngine,0}', '{"key":"postTaxRetirement","label":"Post-Tax Retirement Savings","amount":1393.33,"lyman":451.66,"kateri":941.67}'::jsonb)
where id = 'fcd235c4-070d-4d97-bccf-7045a61ef62f';