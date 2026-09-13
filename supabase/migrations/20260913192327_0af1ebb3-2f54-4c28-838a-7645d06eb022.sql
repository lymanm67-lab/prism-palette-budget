CREATE TABLE public.se_mentor_verdicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  created_by UUID,
  scope TEXT NOT NULL DEFAULT 'TRADE',
  page TEXT,
  symbol TEXT,
  verdict TEXT,
  discipline_score INTEGER,
  headline TEXT,
  rule_breaks JSONB NOT NULL DEFAULT '[]'::jsonb,
  emotional_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  coaching JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_mentor_verdicts TO authenticated;
GRANT ALL ON public.se_mentor_verdicts TO service_role;

ALTER TABLE public.se_mentor_verdicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members manage their mentor verdicts"
ON public.se_mentor_verdicts FOR ALL TO authenticated
USING (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()))
WITH CHECK (household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid()));

CREATE INDEX idx_se_mentor_verdicts_household ON public.se_mentor_verdicts (household_id, created_at DESC);

CREATE TRIGGER update_se_mentor_verdicts_updated_at
BEFORE UPDATE ON public.se_mentor_verdicts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();