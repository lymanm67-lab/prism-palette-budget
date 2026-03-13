CREATE TABLE public.calculator_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  calculator_type text NOT NULL,
  label text NOT NULL DEFAULT '',
  inputs jsonb NOT NULL DEFAULT '{}',
  results jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.calculator_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view calculator snapshots"
  ON public.calculator_snapshots FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert calculator snapshots"
  ON public.calculator_snapshots FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete calculator snapshots"
  ON public.calculator_snapshots FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE INDEX idx_calculator_snapshots_household ON public.calculator_snapshots(household_id, created_at DESC);