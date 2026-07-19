
ALTER TABLE public.credit_disputes
  ADD COLUMN IF NOT EXISTS draft_letter_body text,
  ADD COLUMN IF NOT EXISTS draft_letter_subject text,
  ADD COLUMN IF NOT EXISTS label_purchase_id text,
  ADD COLUMN IF NOT EXISTS label_url text,
  ADD COLUMN IF NOT EXISTS label_rate numeric;

CREATE TABLE IF NOT EXISTS public.score_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  baseline_score int NOT NULL,
  projected_score int NOT NULL,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.score_scenarios TO authenticated;
GRANT ALL ON public.score_scenarios TO service_role;

ALTER TABLE public.score_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage their household score scenarios"
  ON public.score_scenarios
  FOR ALL
  TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE INDEX IF NOT EXISTS idx_score_scenarios_household ON public.score_scenarios(household_id, created_at DESC);
