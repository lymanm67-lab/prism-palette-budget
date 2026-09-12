ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS rollover_rule text NOT NULL DEFAULT 'reset',
  ADD COLUMN IF NOT EXISTS rollover_keep_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sweep_destination text;

CREATE TABLE public.category_rollover_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  month date NOT NULL,
  beginning_rollover numeric NOT NULL DEFAULT 0,
  planned_amount numeric NOT NULL DEFAULT 0,
  actual_spent numeric NOT NULL DEFAULT 0,
  ending_balance numeric NOT NULL DEFAULT 0,
  rolled_forward numeric NOT NULL DEFAULT 0,
  swept_amount numeric NOT NULL DEFAULT 0,
  sweep_destination text,
  rollover_rule text NOT NULL DEFAULT 'reset',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, category_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_rollover_balances TO authenticated;
GRANT ALL ON public.category_rollover_balances TO service_role;
ALTER TABLE public.category_rollover_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage category rollover balances"
  ON public.category_rollover_balances FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_category_rollover_balances_updated BEFORE UPDATE ON public.category_rollover_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.month_end_closes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  month date NOT NULL,
  scope text NOT NULL DEFAULT 'personal',
  income_received numeric NOT NULL DEFAULT 0,
  actual_spending numeric NOT NULL DEFAULT 0,
  actual_transfers numeric NOT NULL DEFAULT 0,
  leftover_cash numeric NOT NULL DEFAULT 0,
  total_rolled_forward numeric NOT NULL DEFAULT 0,
  total_swept numeric NOT NULL DEFAULT 0,
  unassigned_cash numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, month, scope)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.month_end_closes TO authenticated;
GRANT ALL ON public.month_end_closes TO service_role;
ALTER TABLE public.month_end_closes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage month end closes"
  ON public.month_end_closes FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_month_end_closes_updated BEFORE UPDATE ON public.month_end_closes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.leftover_sweep_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 1,
  destination text NOT NULL,
  destination_label text,
  mode text NOT NULL DEFAULT 'percent',
  amount numeric NOT NULL DEFAULT 0,
  cap_amount numeric,
  scope text NOT NULL DEFAULT 'personal',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leftover_sweep_rules TO authenticated;
GRANT ALL ON public.leftover_sweep_rules TO service_role;
ALTER TABLE public.leftover_sweep_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage leftover sweep rules"
  ON public.leftover_sweep_rules FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_leftover_sweep_rules_updated BEFORE UPDATE ON public.leftover_sweep_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.leftover_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  month date NOT NULL,
  scope text NOT NULL DEFAULT 'personal',
  destination text NOT NULL,
  destination_label text,
  amount numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'month_end_leftover',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leftover_allocations TO authenticated;
GRANT ALL ON public.leftover_allocations TO service_role;
ALTER TABLE public.leftover_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage leftover allocations"
  ON public.leftover_allocations FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_leftover_allocations_updated BEFORE UPDATE ON public.leftover_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();