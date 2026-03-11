UPDATE category_groups 
SET expense_type = 'income' 
WHERE name = 'Income/Revenue' 
AND budget_type = 'business' 
AND expense_type = 'flexible';