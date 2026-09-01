-- Buffer settings
CREATE TABLE public.buffer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL UNIQUE,
  healthy_min numeric NOT NULL DEFAULT 1000,
  caution_min numeric NOT NULL DEFAULT 500,
  tight_min numeric NOT NULL DEFAULT 200,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buffer_settings TO authenticated;
GRANT ALL ON public.buffer_settings TO service_role;
ALTER TABLE public.buffer_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buffer_settings_household" ON public.buffer_settings FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_buffer_settings_updated BEFORE UPDATE ON public.buffer_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Buffer monthly ledger
CREATE TABLE public.buffer_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  month text NOT NULL,
  starting_balance numeric NOT NULL DEFAULT 0,
  additions numeric NOT NULL DEFAULT 0,
  withdrawals numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buffer_ledger TO authenticated;
GRANT ALL ON public.buffer_ledger TO service_role;
ALTER TABLE public.buffer_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buffer_ledger_household" ON public.buffer_ledger FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_buffer_ledger_updated BEFORE UPDATE ON public.buffer_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Buffer one-time expenses
CREATE TABLE public.buffer_one_time_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  due_date date NOT NULL,
  label text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'buffer',
  is_paid boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buffer_one_time_expenses TO authenticated;
GRANT ALL ON public.buffer_one_time_expenses TO service_role;
ALTER TABLE public.buffer_one_time_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buffer_one_time_household" ON public.buffer_one_time_expenses FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_buffer_one_time_updated BEFORE UPDATE ON public.buffer_one_time_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Business expenses ledger
CREATE TABLE public.business_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  vendor text NOT NULL,
  brand text,
  purpose text,
  tax_class text NOT NULL DEFAULT 'business_expense',
  renewal_date date,
  payment_method text,
  entity text,
  amount numeric NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'monthly',
  is_owner_investment boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_expenses TO authenticated;
GRANT ALL ON public.business_expenses TO service_role;
ALTER TABLE public.business_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_expenses_household" ON public.business_expenses FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_business_expenses_updated BEFORE UPDATE ON public.business_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Itemized recurring LIVE / ENJOY lines
CREATE TABLE public.recurring_purpose_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  label text NOT NULL,
  purpose money_purpose NOT NULL DEFAULT 'live',
  amount numeric NOT NULL DEFAULT 0,
  start_month text NOT NULL,
  end_month text,
  category_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_purpose_lines TO authenticated;
GRANT ALL ON public.recurring_purpose_lines TO service_role;
ALTER TABLE public.recurring_purpose_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recurring_purpose_lines_household" ON public.recurring_purpose_lines FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_recurring_purpose_lines_updated BEFORE UPDATE ON public.recurring_purpose_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Money redirects
CREATE TABLE public.money_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  source_label text NOT NULL,
  source_amount numeric NOT NULL DEFAULT 0,
  target_label text NOT NULL,
  target_amount numeric NOT NULL DEFAULT 0,
  target_purpose money_purpose,
  start_month text NOT NULL,
  end_month text,
  status text NOT NULL DEFAULT 'scheduled',
  trigger_type text NOT NULL DEFAULT 'manual',
  group_key text,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.money_redirects TO authenticated;
GRANT ALL ON public.money_redirects TO service_role;
ALTER TABLE public.money_redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "money_redirects_household" ON public.money_redirects FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_money_redirects_updated BEFORE UPDATE ON public.money_redirects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Debt item extensions
ALTER TABLE public.debt_items
  ADD COLUMN IF NOT EXISTS extra_payment numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS apr_source text,
  ADD COLUMN IF NOT EXISTS pslf_payments_made integer,
  ADD COLUMN IF NOT EXISTS pslf_payments_required integer,
  ADD COLUMN IF NOT EXISTS original_payoff_date date,
  ADD COLUMN IF NOT EXISTS settlement_separate_payment numeric NOT NULL DEFAULT 0;