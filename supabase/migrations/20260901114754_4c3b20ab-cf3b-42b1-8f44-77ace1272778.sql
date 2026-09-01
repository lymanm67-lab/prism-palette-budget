ALTER TABLE public.layer_a_assignments
  ADD COLUMN IF NOT EXISTS business_inflow numeric,
  ADD COLUMN IF NOT EXISTS business_outflow numeric;