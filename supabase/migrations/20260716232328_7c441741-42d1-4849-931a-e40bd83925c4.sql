ALTER TABLE public.hp_projects
  ADD COLUMN IF NOT EXISTS down_payment_saved numeric,
  ADD COLUMN IF NOT EXISTS down_payment_source text,
  ADD COLUMN IF NOT EXISTS dpa_program_note text;