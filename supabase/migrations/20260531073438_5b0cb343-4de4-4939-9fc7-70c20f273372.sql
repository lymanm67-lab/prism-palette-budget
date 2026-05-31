-- Phase 2: Asset tagging for Legacy Protection

-- 1. Persist legacy calculation method on the plan (replaces localStorage)
ALTER TABLE public.investment_plans
  ADD COLUMN IF NOT EXISTS legacy_calculation_method text NOT NULL DEFAULT 'total',
  ADD COLUMN IF NOT EXISTS legacy_percentage numeric NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS legacy_goal_name text NOT NULL DEFAULT 'Legacy Trust';

-- Validate method values via trigger (CHECK constraints discouraged per project rules)
CREATE OR REPLACE FUNCTION public.validate_legacy_method()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.legacy_calculation_method NOT IN ('total','surplus','percent') THEN
    RAISE EXCEPTION 'Invalid legacy_calculation_method: %', NEW.legacy_calculation_method;
  END IF;
  IF NEW.legacy_percentage < 0 OR NEW.legacy_percentage > 100 THEN
    RAISE EXCEPTION 'legacy_percentage must be between 0 and 100';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_legacy_method_trg ON public.investment_plans;
CREATE TRIGGER validate_legacy_method_trg
  BEFORE INSERT OR UPDATE ON public.investment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_legacy_method();

-- 2. Asset tagging table
CREATE TABLE public.investment_asset_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  asset_key text NOT NULL,
  tag text NOT NULL DEFAULT 'retirement_asset',
  include_in_legacy boolean NOT NULL DEFAULT false,
  custom_label text,
  amount_override numeric,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (plan_id, asset_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_asset_tags TO authenticated;
GRANT ALL ON public.investment_asset_tags TO service_role;

ALTER TABLE public.investment_asset_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view asset tags"
  ON public.investment_asset_tags FOR SELECT TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert asset tags"
  ON public.investment_asset_tags FOR INSERT TO authenticated
  WITH CHECK (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can update asset tags"
  ON public.investment_asset_tags FOR UPDATE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete asset tags"
  ON public.investment_asset_tags FOR DELETE TO authenticated
  USING (is_household_member(auth.uid(), household_id));

-- Validate tag values
CREATE OR REPLACE FUNCTION public.validate_asset_tag()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tag NOT IN (
    'household_income','retirement_asset','legacy_funding_asset','medical_reserve',
    'excluded_from_legacy','spouse_asset','pension_income_only','trust_funding_asset'
  ) THEN
    RAISE EXCEPTION 'Invalid asset tag: %', NEW.tag;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_asset_tag_trg
  BEFORE INSERT OR UPDATE ON public.investment_asset_tags
  FOR EACH ROW EXECUTE FUNCTION public.validate_asset_tag();

CREATE TRIGGER update_investment_asset_tags_updated_at
  BEFORE UPDATE ON public.investment_asset_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_investment_asset_tags_plan ON public.investment_asset_tags(plan_id);
CREATE INDEX idx_investment_asset_tags_household ON public.investment_asset_tags(household_id);

-- 3. Spouse asset fields on investment_plans (used for exclusion display)
ALTER TABLE public.investment_plans
  ADD COLUMN IF NOT EXISTS spouse_pension_monthly numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spouse_pension_account_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spouse_deferred_comp_value numeric NOT NULL DEFAULT 0;