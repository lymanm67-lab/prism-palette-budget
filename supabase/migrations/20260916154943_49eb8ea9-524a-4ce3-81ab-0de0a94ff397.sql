CREATE TABLE public.se_execution_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  guide_key TEXT NOT NULL,
  guide_kind TEXT NOT NULL,
  guide_version TEXT NOT NULL DEFAULT '1.0',
  title TEXT NOT NULL,
  symbol TEXT,
  saved_to TEXT NOT NULL DEFAULT 'JOURNAL',
  trade_plan_id UUID,
  paper_trade_id UUID,
  execution_ticket_id UUID,
  trade_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  orientation TEXT NOT NULL DEFAULT 'PORTRAIT',
  printed_at TIMESTAMP WITH TIME ZONE,
  downloaded_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_execution_guides TO authenticated;
GRANT ALL ON public.se_execution_guides TO service_role;
ALTER TABLE public.se_execution_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage execution guides"
  ON public.se_execution_guides FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_se_execution_guides_updated BEFORE UPDATE ON public.se_execution_guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_se_execution_guides_household ON public.se_execution_guides (household_id, created_at DESC);