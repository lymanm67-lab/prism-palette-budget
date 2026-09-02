ALTER TABLE public.layer_a_assignments
  ADD COLUMN IF NOT EXISTS auto_balance boolean NOT NULL DEFAULT false;