ALTER TABLE public.category_groups ADD COLUMN budget_type text NOT NULL DEFAULT 'personal';

-- Update existing groups to personal by default
UPDATE public.category_groups SET budget_type = 'personal' WHERE budget_type IS NULL;