alter table public.household_profile
  add column if not exists investments_total_override numeric,
  add column if not exists debt_balance_override numeric,
  add column if not exists debt_minimums_override numeric,
  add column if not exists budget_expenses_override numeric;