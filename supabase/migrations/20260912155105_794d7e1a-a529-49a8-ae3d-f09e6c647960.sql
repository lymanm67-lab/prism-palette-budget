CREATE TABLE public.se_symbol_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  portfolio_role text NOT NULL DEFAULT 'UNASSIGNED',
  trading_status text NOT NULL DEFAULT 'SCAN_UNIVERSE',
  notes text,
  status_changed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (household_id, symbol)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_symbol_roles TO authenticated;
GRANT ALL ON public.se_symbol_roles TO service_role;
ALTER TABLE public.se_symbol_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage symbol roles" ON public.se_symbol_roles FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_se_symbol_roles_updated BEFORE UPDATE ON public.se_symbol_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.se_symbol_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  portfolio_role text,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.se_symbol_status_history TO authenticated;
GRANT ALL ON public.se_symbol_status_history TO service_role;
ALTER TABLE public.se_symbol_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage symbol status history" ON public.se_symbol_status_history FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE INDEX idx_se_symbol_status_history_symbol ON public.se_symbol_status_history (household_id, symbol, created_at DESC);