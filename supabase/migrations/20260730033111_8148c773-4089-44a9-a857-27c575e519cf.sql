UPDATE public.accounts SET deleted_at = now() WHERE deleted_at IS NULL AND name = 'Vacation Loan';
UPDATE public.accounts SET balance = 0 WHERE deleted_at IS NULL AND name = 'Apple Cash';
DELETE FROM public.debt_items d USING public.debt_plans p
WHERE d.plan_id = p.id AND d.name NOT IN ('Nelnet- Student Loan','SBA Business Loann');