update public.spending_plans
set income = income || '{"lymanNet":3970.87,"kateriNet":7156.67}'::jsonb,
    buckets = jsonb_set(
      buckets,
      '{wealthEngine}',
      (buckets->'wealthEngine') || '[{"key":"employerRetirement","label":"Employer Retirement Contribution (9% non-elective)","amount":2037.88,"lyman":719.55,"kateri":1318.33}]'::jsonb
    )
where id = 'fcd235c4-070d-4d97-bccf-7045a61ef62f'
  and not (buckets->'wealthEngine' @> '[{"key":"employerRetirement"}]'::jsonb);