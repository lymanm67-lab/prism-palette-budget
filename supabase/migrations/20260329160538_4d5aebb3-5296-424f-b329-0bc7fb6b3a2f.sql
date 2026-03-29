ALTER TABLE public.category_groups 
  ADD COLUMN IF NOT EXISTS target_percent_min numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_percent_max numeric DEFAULT NULL;