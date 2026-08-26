
CREATE TABLE public.categorization_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  rule_key TEXT,
  rule_name TEXT NOT NULL,
  before_merchant TEXT,
  after_merchant TEXT,
  before_category_id UUID,
  before_category_name TEXT,
  after_category_id UUID,
  after_category_name TEXT,
  txn_date DATE,
  amount NUMERIC,
  reverted_at TIMESTAMP WITH TIME ZONE,
  applied_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_categorization_audit_household_created ON public.categorization_audit (household_id, created_at DESC);
CREATE INDEX idx_categorization_audit_rule ON public.categorization_audit (household_id, rule_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorization_audit TO authenticated;
GRANT ALL ON public.categorization_audit TO service_role;

ALTER TABLE public.categorization_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view categorization audit"
ON public.categorization_audit FOR SELECT TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can insert categorization audit"
ON public.categorization_audit FOR INSERT TO authenticated
WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can update categorization audit"
ON public.categorization_audit FOR UPDATE TO authenticated
USING (public.is_household_member(auth.uid(), household_id))
WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Household members can delete categorization audit"
ON public.categorization_audit FOR DELETE TO authenticated
USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_categorization_audit_updated_at
BEFORE UPDATE ON public.categorization_audit
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
