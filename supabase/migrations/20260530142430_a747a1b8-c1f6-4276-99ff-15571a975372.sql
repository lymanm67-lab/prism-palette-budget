
-- ============ method_entities ============
CREATE TABLE public.method_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  user_id UUID NOT NULL,
  method_entity_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  kyc_first_name TEXT,
  kyc_last_name TEXT,
  kyc_phone TEXT,
  kyc_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.method_entities TO authenticated;
GRANT ALL ON public.method_entities TO service_role;
ALTER TABLE public.method_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view method_entities"
  ON public.method_entities FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can insert method_entities"
  ON public.method_entities FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update method_entities"
  ON public.method_entities FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete method_entities"
  ON public.method_entities FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_method_entities_household ON public.method_entities(household_id);
CREATE TRIGGER trg_method_entities_updated_at
  BEFORE UPDATE ON public.method_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ method_accounts (funding sources) ============
CREATE TABLE public.method_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  entity_id UUID NOT NULL REFERENCES public.method_entities(id) ON DELETE CASCADE,
  method_account_id TEXT NOT NULL UNIQUE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'ach',
  status TEXT NOT NULL DEFAULT 'active',
  mask TEXT,
  routing TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.method_accounts TO authenticated;
GRANT ALL ON public.method_accounts TO service_role;
ALTER TABLE public.method_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view method_accounts"
  ON public.method_accounts FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can insert method_accounts"
  ON public.method_accounts FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update method_accounts"
  ON public.method_accounts FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete method_accounts"
  ON public.method_accounts FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_method_accounts_household ON public.method_accounts(household_id);
CREATE INDEX idx_method_accounts_entity ON public.method_accounts(entity_id);
CREATE TRIGGER trg_method_accounts_updated_at
  BEFORE UPDATE ON public.method_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ method_liabilities (payable bills) ============
CREATE TABLE public.method_liabilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  entity_id UUID NOT NULL REFERENCES public.method_entities(id) ON DELETE CASCADE,
  method_liability_id TEXT NOT NULL UNIQUE,
  merchant_name TEXT NOT NULL,
  mch_id TEXT,
  mask TEXT,
  liability_type TEXT,
  balance NUMERIC(12,2),
  next_payment_minimum_amount NUMERIC(12,2),
  next_payment_due_date DATE,
  recurring_transaction_id UUID REFERENCES public.recurring_transactions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.method_liabilities TO authenticated;
GRANT ALL ON public.method_liabilities TO service_role;
ALTER TABLE public.method_liabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view method_liabilities"
  ON public.method_liabilities FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can insert method_liabilities"
  ON public.method_liabilities FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update method_liabilities"
  ON public.method_liabilities FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete method_liabilities"
  ON public.method_liabilities FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_method_liabilities_household ON public.method_liabilities(household_id);
CREATE INDEX idx_method_liabilities_entity ON public.method_liabilities(entity_id);
CREATE INDEX idx_method_liabilities_recurring ON public.method_liabilities(recurring_transaction_id);
CREATE TRIGGER trg_method_liabilities_updated_at
  BEFORE UPDATE ON public.method_liabilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ method_payments ============
CREATE TABLE public.method_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  method_payment_id TEXT UNIQUE,
  source_method_account_id UUID NOT NULL REFERENCES public.method_accounts(id) ON DELETE RESTRICT,
  destination_method_liability_id UUID NOT NULL REFERENCES public.method_liabilities(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  estimated_completion_date DATE,
  error_code TEXT,
  error_message TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  initiated_by_user_id UUID,
  is_autopay BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.method_payments TO authenticated;
GRANT ALL ON public.method_payments TO service_role;
ALTER TABLE public.method_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view method_payments"
  ON public.method_payments FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can insert method_payments"
  ON public.method_payments FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update method_payments"
  ON public.method_payments FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete method_payments"
  ON public.method_payments FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_method_payments_household ON public.method_payments(household_id);
CREATE INDEX idx_method_payments_destination ON public.method_payments(destination_method_liability_id);
CREATE INDEX idx_method_payments_status ON public.method_payments(status);
CREATE TRIGGER trg_method_payments_updated_at
  BEFORE UPDATE ON public.method_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ method_autopay_rules ============
CREATE TABLE public.method_autopay_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  liability_id UUID NOT NULL UNIQUE REFERENCES public.method_liabilities(id) ON DELETE CASCADE,
  source_method_account_id UUID NOT NULL REFERENCES public.method_accounts(id) ON DELETE RESTRICT,
  strategy TEXT NOT NULL DEFAULT 'minimum',
  fixed_amount NUMERIC(12,2),
  lead_days INT NOT NULL DEFAULT 3,
  max_amount_cap NUMERIC(12,2) NOT NULL DEFAULT 2500,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.method_autopay_rules TO authenticated;
GRANT ALL ON public.method_autopay_rules TO service_role;
ALTER TABLE public.method_autopay_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view method_autopay_rules"
  ON public.method_autopay_rules FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can insert method_autopay_rules"
  ON public.method_autopay_rules FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can update method_autopay_rules"
  ON public.method_autopay_rules FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members can delete method_autopay_rules"
  ON public.method_autopay_rules FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_method_autopay_rules_household ON public.method_autopay_rules(household_id);
CREATE TRIGGER trg_method_autopay_rules_updated_at
  BEFORE UPDATE ON public.method_autopay_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
