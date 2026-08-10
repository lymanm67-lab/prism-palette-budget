-- Tax classification on retirement accounts
ALTER TABLE public.retirement_accounts
  ADD COLUMN IF NOT EXISTS tax_bucket text NOT NULL DEFAULT 'pretax',
  ADD COLUMN IF NOT EXISTS owner text,
  ADD COLUMN IF NOT EXISTS rmd_applicable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_inherited boolean NOT NULL DEFAULT false;

-- Household-level tax control settings
CREATE TABLE IF NOT EXISTS public.tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  filing_status text NOT NULL DEFAULT 'married_joint',
  state text NOT NULL DEFAULT 'OH',
  birth_year integer NOT NULL DEFAULT 1966,
  spouse_birth_year integer,
  rmd_start_age integer NOT NULL DEFAULT 75,
  planning_end_age integer NOT NULL DEFAULT 100,
  assumed_return numeric NOT NULL DEFAULT 8,
  inflation numeric NOT NULL DEFAULT 2.5,
  target_bracket numeric NOT NULL DEFAULT 22,
  irmaa_guard boolean NOT NULL DEFAULT true,
  qcd_annual_target numeric NOT NULL DEFAULT 0,
  foundation_annual_target numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_settings TO authenticated;
GRANT ALL ON public.tax_settings TO service_role;
ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage tax settings" ON public.tax_settings
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_tax_settings_updated BEFORE UPDATE ON public.tax_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Business losses / NOL carryforwards used to offset conversion income
CREATE TABLE IF NOT EXISTS public.tax_business_losses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  entity_name text NOT NULL,
  tax_year integer NOT NULL,
  loss_amount numeric NOT NULL DEFAULT 0,
  used_amount numeric NOT NULL DEFAULT 0,
  loss_type text NOT NULL DEFAULT 'operating',
  is_carryforward boolean NOT NULL DEFAULT true,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_business_losses TO authenticated;
GRANT ALL ON public.tax_business_losses TO service_role;
ALTER TABLE public.tax_business_losses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage business losses" ON public.tax_business_losses
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_tax_business_losses_updated BEFORE UPDATE ON public.tax_business_losses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Planned / executed Roth conversions
CREATE TABLE IF NOT EXISTS public.tax_roth_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  tax_year integer NOT NULL,
  source_account_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned',
  estimated_tax numeric NOT NULL DEFAULT 0,
  marginal_rate numeric,
  offset_by_losses numeric NOT NULL DEFAULT 0,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_roth_conversions TO authenticated;
GRANT ALL ON public.tax_roth_conversions TO service_role;
ALTER TABLE public.tax_roth_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage roth conversions" ON public.tax_roth_conversions
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_tax_roth_conversions_updated BEFORE UPDATE ON public.tax_roth_conversions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Charitable giving plan (QCD / DAF / foundation)
CREATE TABLE IF NOT EXISTS public.tax_charitable_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  tax_year integer NOT NULL,
  vehicle text NOT NULL DEFAULT 'qcd',
  amount numeric NOT NULL DEFAULT 0,
  source_account_id uuid,
  recipient text,
  counts_toward_rmd boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_charitable_plans TO authenticated;
GRANT ALL ON public.tax_charitable_plans TO service_role;
ALTER TABLE public.tax_charitable_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage charitable plans" ON public.tax_charitable_plans
  FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_tax_charitable_plans_updated BEFORE UPDATE ON public.tax_charitable_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();