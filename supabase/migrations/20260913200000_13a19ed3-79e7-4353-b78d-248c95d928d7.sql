CREATE TABLE public.se_trading_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  created_by UUID,
  rule_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  threshold NUMERIC,
  custom_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_trading_rules TO authenticated;
GRANT ALL ON public.se_trading_rules TO service_role;

ALTER TABLE public.se_trading_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members manage their trading rules"
ON public.se_trading_rules FOR ALL TO authenticated
USING (household_id IN (SELECT hm.household_id FROM public.household_members hm WHERE hm.user_id = auth.uid()))
WITH CHECK (household_id IN (SELECT hm.household_id FROM public.household_members hm WHERE hm.user_id = auth.uid()));

CREATE INDEX idx_se_trading_rules_household ON public.se_trading_rules (household_id, sort_order);

CREATE TRIGGER update_se_trading_rules_updated_at
BEFORE UPDATE ON public.se_trading_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();