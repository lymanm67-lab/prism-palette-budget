
-- 1. Limits (one per household)
CREATE TABLE public.app_dev_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL UNIQUE,
  monthly_spend_limit NUMERIC NOT NULL DEFAULT 100,
  monthly_credit_limit INTEGER NOT NULL DEFAULT 400,
  tracked_category_id UUID,
  period_start DATE NOT NULL DEFAULT date_trunc('month', now())::date,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_dev_limits TO authenticated;
GRANT ALL ON public.app_dev_limits TO service_role;
ALTER TABLE public.app_dev_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household members manage limits"
  ON public.app_dev_limits FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_app_dev_limits_updated_at
  BEFORE UPDATE ON public.app_dev_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Credit log
CREATE TABLE public.app_dev_credit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  credits_used INTEGER NOT NULL CHECK (credits_used > 0),
  note TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_app_dev_credit_log_household_date
  ON public.app_dev_credit_log(household_id, date) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_dev_credit_log TO authenticated;
GRANT ALL ON public.app_dev_credit_log TO service_role;
ALTER TABLE public.app_dev_credit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household members manage credit log"
  ON public.app_dev_credit_log FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

-- 3. Overrides
CREATE TABLE public.app_dev_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  requested_by UUID NOT NULL DEFAULT auth.uid(),
  approved_by UUID,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_dev_overrides_household_status
  ON public.app_dev_overrides(household_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_dev_overrides TO authenticated;
GRANT ALL ON public.app_dev_overrides TO service_role;
ALTER TABLE public.app_dev_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household members view overrides"
  ON public.app_dev_overrides FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "household members request overrides"
  ON public.app_dev_overrides FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id) AND requested_by = auth.uid());
CREATE POLICY "admins approve overrides"
  ON public.app_dev_overrides FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_app_dev_overrides_updated_at
  BEFORE UPDATE ON public.app_dev_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
