-- ============================================================
-- App-Dev Pool (Shared global guardrail across all 7 apps)
-- Lives in PrismMoney as the hub. Other apps post via edge fn.
-- ============================================================

-- Settings: one row per founder email (global $/credit cap)
CREATE TABLE public.app_dev_pool_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  founder_email TEXT NOT NULL UNIQUE,
  monthly_spend_limit NUMERIC NOT NULL DEFAULT 100,
  monthly_credit_limit NUMERIC NOT NULL DEFAULT 400,
  period_start DATE NOT NULL DEFAULT date_trunc('month', now())::date,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-app credit log entries (one row per Lovable charge/top-up)
CREATE TABLE public.app_dev_pool_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  founder_email TEXT NOT NULL,
  app_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_usd NUMERIC NOT NULL DEFAULT 0,
  credits_used NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'edge'
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_dev_pool_log_email_date
  ON public.app_dev_pool_log (founder_email, date DESC)
  WHERE deleted_at IS NULL;

-- Overrides (emergency unlock when over limit)
CREATE TABLE public.app_dev_pool_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  founder_email TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','denied')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GRANTS (auth-only — gated by JWT email match in RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_dev_pool_settings TO authenticated;
GRANT ALL ON public.app_dev_pool_settings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_dev_pool_log TO authenticated;
GRANT ALL ON public.app_dev_pool_log TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_dev_pool_overrides TO authenticated;
GRANT ALL ON public.app_dev_pool_overrides TO service_role;

-- RLS
ALTER TABLE public.app_dev_pool_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_dev_pool_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_dev_pool_overrides ENABLE ROW LEVEL SECURITY;

-- Founder-by-email gating: a user only sees rows matching their auth email.
-- Other users of PrismMoney never see any rows because their email won't match.
CREATE POLICY "Founder sees own pool settings"
  ON public.app_dev_pool_settings FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'email') = founder_email)
  WITH CHECK ((auth.jwt() ->> 'email') = founder_email);

CREATE POLICY "Founder sees own pool log"
  ON public.app_dev_pool_log FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'email') = founder_email)
  WITH CHECK ((auth.jwt() ->> 'email') = founder_email);

CREATE POLICY "Founder sees own pool overrides"
  ON public.app_dev_pool_overrides FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'email') = founder_email)
  WITH CHECK ((auth.jwt() ->> 'email') = founder_email);

-- Updated_at trigger
CREATE TRIGGER set_app_dev_pool_settings_updated_at
  BEFORE UPDATE ON public.app_dev_pool_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
