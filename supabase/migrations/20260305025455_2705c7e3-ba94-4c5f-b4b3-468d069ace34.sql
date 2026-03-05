DO $$
DECLARE
  hid uuid := '22b0f75a-82f2-4b56-85b9-1db72b95da1b';
  g record;
  month_val date := '2026-03-01'::date;
  gid uuid;
BEGIN
  -- Business 1
  INSERT INTO category_groups (household_id, name, color, sort_order, budget_type) VALUES
    (hid, 'Business 1 - Revenue', '#059669', 10, 'business') RETURNING id INTO gid;
  INSERT INTO categories (household_id, group_id, name, color, sort_order) VALUES
    (hid, gid, 'Sales Revenue', '#059669', 0), (hid, gid, 'Service Income', '#10b981', 1), (hid, gid, 'Consulting Fees', '#34d399', 2);

  INSERT INTO category_groups (household_id, name, color, sort_order, budget_type) VALUES
    (hid, 'Business 1 - Operations', '#2563eb', 11, 'business') RETURNING id INTO gid;
  INSERT INTO categories (household_id, group_id, name, color, sort_order) VALUES
    (hid, gid, 'Rent & Utilities', '#2563eb', 0), (hid, gid, 'Software & Tools', '#3b82f6', 1),
    (hid, gid, 'Payroll', '#60a5fa', 2), (hid, gid, 'Insurance', '#93c5fd', 3), (hid, gid, 'Office Supplies', '#bfdbfe', 4);

  INSERT INTO category_groups (household_id, name, color, sort_order, budget_type) VALUES
    (hid, 'Business 1 - Marketing', '#ea580c', 12, 'business') RETURNING id INTO gid;
  INSERT INTO categories (household_id, group_id, name, color, sort_order) VALUES
    (hid, gid, 'Advertising', '#ea580c', 0), (hid, gid, 'Content & Social Media', '#f97316', 1), (hid, gid, 'Events & Networking', '#fb923c', 2);

  -- Business 2
  INSERT INTO category_groups (household_id, name, color, sort_order, budget_type) VALUES
    (hid, 'Business 2 - Revenue', '#14b8a6', 20, 'business') RETURNING id INTO gid;
  INSERT INTO categories (household_id, group_id, name, color, sort_order) VALUES
    (hid, gid, 'Sales Revenue', '#14b8a6', 0), (hid, gid, 'Service Income', '#2dd4bf', 1), (hid, gid, 'Consulting Fees', '#5eead4', 2);

  INSERT INTO category_groups (household_id, name, color, sort_order, budget_type) VALUES
    (hid, 'Business 2 - Operations', '#6366f1', 21, 'business') RETURNING id INTO gid;
  INSERT INTO categories (household_id, group_id, name, color, sort_order) VALUES
    (hid, gid, 'Rent & Utilities', '#6366f1', 0), (hid, gid, 'Software & Tools', '#818cf8', 1),
    (hid, gid, 'Payroll', '#a5b4fc', 2), (hid, gid, 'Insurance', '#c7d2fe', 3), (hid, gid, 'Office Supplies', '#e0e7ff', 4);

  INSERT INTO category_groups (household_id, name, color, sort_order, budget_type) VALUES
    (hid, 'Business 2 - Marketing', '#f59e0b', 22, 'business') RETURNING id INTO gid;
  INSERT INTO categories (household_id, group_id, name, color, sort_order) VALUES
    (hid, gid, 'Advertising', '#f59e0b', 0), (hid, gid, 'Content & Social Media', '#fbbf24', 1), (hid, gid, 'Events & Networking', '#fcd34d', 2);

  -- Business 3
  INSERT INTO category_groups (household_id, name, color, sort_order, budget_type) VALUES
    (hid, 'Business 3 - Revenue', '#0891b2', 30, 'business') RETURNING id INTO gid;
  INSERT INTO categories (household_id, group_id, name, color, sort_order) VALUES
    (hid, gid, 'Sales Revenue', '#0891b2', 0), (hid, gid, 'Service Income', '#22d3ee', 1), (hid, gid, 'Consulting Fees', '#67e8f9', 2);

  INSERT INTO category_groups (household_id, name, color, sort_order, budget_type) VALUES
    (hid, 'Business 3 - Operations', '#7c3aed', 31, 'business') RETURNING id INTO gid;
  INSERT INTO categories (household_id, group_id, name, color, sort_order) VALUES
    (hid, gid, 'Rent & Utilities', '#7c3aed', 0), (hid, gid, 'Software & Tools', '#8b5cf6', 1),
    (hid, gid, 'Payroll', '#a78bfa', 2), (hid, gid, 'Insurance', '#c4b5fd', 3), (hid, gid, 'Office Supplies', '#ddd6fe', 4);

  INSERT INTO category_groups (household_id, name, color, sort_order, budget_type) VALUES
    (hid, 'Business 3 - Marketing', '#dc2626', 32, 'business') RETURNING id INTO gid;
  INSERT INTO categories (household_id, group_id, name, color, sort_order) VALUES
    (hid, gid, 'Advertising', '#dc2626', 0), (hid, gid, 'Content & Social Media', '#ef4444', 1), (hid, gid, 'Events & Networking', '#f87171', 2);

  -- Create budgets for all business categories
  FOR g IN SELECT c.id as cat_id, c.name as cat_name FROM categories c
    JOIN category_groups cg ON c.group_id = cg.id
    WHERE cg.household_id = hid AND cg.budget_type = 'business'
  LOOP
    INSERT INTO budgets (household_id, category_id, month, planned_amount)
    VALUES (hid, g.cat_id, month_val,
      CASE
        WHEN g.cat_name = 'Sales Revenue' THEN 10000
        WHEN g.cat_name = 'Service Income' THEN 5000
        WHEN g.cat_name = 'Consulting Fees' THEN 3000
        WHEN g.cat_name = 'Rent & Utilities' THEN 2000
        WHEN g.cat_name = 'Software & Tools' THEN 500
        WHEN g.cat_name = 'Payroll' THEN 5000
        WHEN g.cat_name = 'Insurance' THEN 300
        WHEN g.cat_name = 'Office Supplies' THEN 200
        WHEN g.cat_name = 'Advertising' THEN 1000
        WHEN g.cat_name = 'Content & Social Media' THEN 500
        WHEN g.cat_name = 'Events & Networking' THEN 300
        ELSE 500
      END
    );
  END LOOP;

  -- Create budgets for personal categories not yet budgeted
  FOR g IN SELECT c.id as cat_id, c.name as cat_name FROM categories c
    JOIN category_groups cg ON c.group_id = cg.id
    WHERE cg.household_id = hid AND cg.budget_type = 'personal'
    AND c.id NOT IN (SELECT category_id FROM budgets WHERE month = month_val AND household_id = hid)
  LOOP
    INSERT INTO budgets (household_id, category_id, month, planned_amount)
    VALUES (hid, g.cat_id, month_val,
      CASE
        WHEN g.cat_name = 'Rent' THEN 1500
        WHEN g.cat_name = 'Groceries' THEN 600
        WHEN g.cat_name = 'Gas' THEN 200
        WHEN g.cat_name = 'Subscriptions' THEN 100
        WHEN g.cat_name = 'Dining Out' THEN 300
        WHEN g.cat_name = 'Salary' THEN 5000
        ELSE 250
      END
    );
  END LOOP;
END $$;