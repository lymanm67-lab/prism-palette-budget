INSERT INTO public.category_groups (household_id, name, expense_type, color)
VALUES ('22b0f75a-82f2-4b56-85b9-1db72b95da1b', 'Sinking Funds (Non-Monthly)', 'non_monthly', '#f59e0b')
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (group_id, household_id, name, color)
SELECT g.id, g.household_id, 'Auto Maintenance & Tags', '#f59e0b'
FROM public.category_groups g
WHERE g.household_id = '22b0f75a-82f2-4b56-85b9-1db72b95da1b'
  AND g.name = 'Sinking Funds (Non-Monthly)'
  AND NOT EXISTS (
    SELECT 1 FROM public.categories c WHERE c.group_id = g.id AND c.name = 'Auto Maintenance & Tags'
  );