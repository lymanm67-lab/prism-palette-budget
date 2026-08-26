DO $$
DECLARE
  v_household_id UUID := '22b0f75a-82f2-4b56-85b9-1db72b95da1b';
  v_group_id UUID := gen_random_uuid();
  v_group_sort INTEGER;
  v_category_sort INTEGER;
BEGIN
  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_group_sort FROM public.category_groups WHERE household_id = v_household_id;
  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_category_sort FROM public.categories WHERE household_id = v_household_id;

  INSERT INTO public.category_groups (id, household_id, name, color, sort_order, budget_type, expense_type)
  VALUES (v_group_id, v_household_id, 'Credit Monitoring', '#6366F1', v_group_sort, 'personal', 'fixed');

  INSERT INTO public.categories (id, group_id, household_id, name, color, sort_order)
  VALUES (gen_random_uuid(), v_group_id, v_household_id, 'Myfico', '#6366F1', v_category_sort);
END $$;