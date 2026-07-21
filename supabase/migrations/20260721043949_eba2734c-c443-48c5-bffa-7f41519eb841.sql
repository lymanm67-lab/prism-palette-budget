
-- ============================================================
-- FINANCIAL OPERATING SYSTEM — Phase 1 migration
-- ============================================================

-- 1. INSURANCE COVERAGE
CREATE TABLE public.insurance_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- life, term_life, whole_life, disability, health, ltc, umbrella, auto, home, business
  carrier TEXT,
  policy_number TEXT,
  coverage_amount NUMERIC DEFAULT 0,
  annual_premium NUMERIC DEFAULT 0,
  beneficiary TEXT,
  renewal_date DATE,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_coverage TO authenticated;
GRANT ALL ON public.insurance_coverage TO service_role;
ALTER TABLE public.insurance_coverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage insurance" ON public.insurance_coverage FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_insurance_updated_at BEFORE UPDATE ON public.insurance_coverage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_insurance_household ON public.insurance_coverage(household_id) WHERE deleted_at IS NULL;

-- 2. LEGACY WORTH SNAPSHOTS
CREATE TABLE public.legacy_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  score NUMERIC NOT NULL DEFAULT 0, -- 0-1000
  factor_scores JSONB NOT NULL DEFAULT '{}'::jsonb, -- {net_worth: 82, retirement: 65, ...}
  life_stage TEXT, -- builder, protector, multiplier, freedom, legacy_builder, family_endowment
  fi_percentage NUMERIC DEFAULT 0,
  days_until_freedom INTEGER,
  passive_income_coverage NUMERIC DEFAULT 0,
  projected_estate_at_85 NUMERIC DEFAULT 0,
  net_worth NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legacy_worth_snapshots TO authenticated;
GRANT ALL ON public.legacy_worth_snapshots TO service_role;
ALTER TABLE public.legacy_worth_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members read snapshots" ON public.legacy_worth_snapshots FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members write snapshots" ON public.legacy_worth_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members update snapshots" ON public.legacy_worth_snapshots FOR UPDATE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Household members delete snapshots" ON public.legacy_worth_snapshots FOR DELETE TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE INDEX idx_lws_household_date ON public.legacy_worth_snapshots(household_id, snapshot_date DESC);
CREATE UNIQUE INDEX ux_lws_daily ON public.legacy_worth_snapshots(household_id, snapshot_date);

-- 3. KUNG FOO PLANS
CREATE TABLE public.kungfoo_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ordered_steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{step, key, label, priority, allocation_amt, rationale, unlock_when, done}]
  context JSONB NOT NULL DEFAULT '{}'::jsonb, -- {age, income, bracket, match_pct, cash, high_int_debt, timeline, family_size}
  next_action TEXT,
  ai_rationale TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kungfoo_plans TO authenticated;
GRANT ALL ON public.kungfoo_plans TO service_role;
ALTER TABLE public.kungfoo_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage kungfoo plans" ON public.kungfoo_plans FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_kungfoo_updated_at BEFORE UPDATE ON public.kungfoo_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_kungfoo_household_active ON public.kungfoo_plans(household_id, is_active);

-- 4. USER PROGRESSION (belts)
CREATE TABLE public.user_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  current_belt TEXT NOT NULL DEFAULT 'white', -- white, yellow, orange, green, blue, purple, brown, black, master, grandmaster
  belt_earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  milestones_completed JSONB NOT NULL DEFAULT '{}'::jsonb, -- {emergency_fund_3mo: true, ...}
  next_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  celebration_seen BOOLEAN NOT NULL DEFAULT false,
  history JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{belt, earned_at}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progression TO authenticated;
GRANT ALL ON public.user_progression TO service_role;
ALTER TABLE public.user_progression ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own progression" ON public.user_progression FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Users write own progression" ON public.user_progression FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progression" ON public.user_progression FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users delete own progression" ON public.user_progression FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE TRIGGER trg_progression_updated_at BEFORE UPDATE ON public.user_progression
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX ux_progression_user ON public.user_progression(user_id);

-- 5. FAMILY LEGACY TRUSTS
CREATE TABLE public.family_legacy_trusts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Family Legacy Trust',
  trust_type TEXT DEFAULT 'revocable_living', -- revocable_living, irrevocable, dynasty, charitable_remainder, ilit
  current_assets NUMERIC DEFAULT 0,
  funding_target NUMERIC DEFAULT 0,
  life_insurance_funding NUMERIC DEFAULT 0,
  annual_contribution NUMERIC DEFAULT 0,
  trustee TEXT,
  successor_trustee TEXT,
  readiness_score NUMERIC DEFAULT 0, -- 0-100 from checklist
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_legacy_trusts TO authenticated;
GRANT ALL ON public.family_legacy_trusts TO service_role;
ALTER TABLE public.family_legacy_trusts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage trusts" ON public.family_legacy_trusts FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_flt_updated_at BEFORE UPDATE ON public.family_legacy_trusts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_flt_household ON public.family_legacy_trusts(household_id) WHERE deleted_at IS NULL;

-- 6. FAMILY CONSTITUTIONS
CREATE TABLE public.family_constitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  family_name TEXT NOT NULL DEFAULT 'Our Family',
  sections JSONB NOT NULL DEFAULT '{}'::jsonb, -- {mission, values, faith, financial, investment, giving, business, education, marriage, decision_rules, trustee_expectations, summit_agenda, legacy_letter, ethical_will}
  version INTEGER NOT NULL DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_constitutions TO authenticated;
GRANT ALL ON public.family_constitutions TO service_role;
ALTER TABLE public.family_constitutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage constitutions" ON public.family_constitutions FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_fc_updated_at BEFORE UPDATE ON public.family_constitutions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fc_household ON public.family_constitutions(household_id) WHERE deleted_at IS NULL;

-- 7. FAMILY BENEFICIARIES
CREATE TABLE public.family_beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  date_of_birth DATE,
  allocation_pct NUMERIC DEFAULT 0,
  is_contingent BOOLEAN NOT NULL DEFAULT false,
  linked_account_id UUID,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_beneficiaries TO authenticated;
GRANT ALL ON public.family_beneficiaries TO service_role;
ALTER TABLE public.family_beneficiaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage beneficiaries" ON public.family_beneficiaries FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_fb_updated_at BEFORE UPDATE ON public.family_beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fb_household ON public.family_beneficiaries(household_id) WHERE deleted_at IS NULL;

-- 8. ESTATE PLANNING CHECKLIST
CREATE TABLE public.estate_planning_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL, -- will, revocable_trust, poa_financial, poa_healthcare, healthcare_directive, hipaa_release, beneficiary_review, digital_asset_inventory, letter_of_intent, guardian_designation, funeral_wishes, life_insurance_review, ilit, umbrella_review, business_succession, buy_sell_agreement, family_meeting, tax_projection, roth_conversion_plan, charitable_plan, legacy_letter, ethical_will
  is_complete BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  document_url TEXT,
  professional_name TEXT,
  next_review_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estate_planning_checklist TO authenticated;
GRANT ALL ON public.estate_planning_checklist TO service_role;
ALTER TABLE public.estate_planning_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage estate checklist" ON public.estate_planning_checklist FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_epc_updated_at BEFORE UPDATE ON public.estate_planning_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX ux_epc_household_item ON public.estate_planning_checklist(household_id, item_key);

-- 9. FAMILY WEALTH EVENTS
CREATE TABLE public.family_wealth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL, -- birth, marriage, business_sale, inheritance, distribution, home_purchase, retirement, other
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC,
  is_projected BOOLEAN NOT NULL DEFAULT false,
  generation INTEGER, -- 1 = current, 2 = children, 3 = grandchildren
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_wealth_events TO authenticated;
GRANT ALL ON public.family_wealth_events TO service_role;
ALTER TABLE public.family_wealth_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage wealth events" ON public.family_wealth_events FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_fwe_updated_at BEFORE UPDATE ON public.family_wealth_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fwe_household_date ON public.family_wealth_events(household_id, event_date) WHERE deleted_at IS NULL;

-- 10. HUNDRED YEAR SCENARIOS
CREATE TABLE public.hundred_year_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Baseline',
  horizon_years INTEGER NOT NULL DEFAULT 100,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb, -- {return, inflation, tax_rate, annual_distribution_pct, charitable_pct, additional_contrib, business_growth, life_insurance, generations}
  results JSONB, -- {nominal_fv, real_fv, sustainability, probability_preserved, generations_supported, monte_carlo_paths, tornado}
  is_baseline BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hundred_year_scenarios TO authenticated;
GRANT ALL ON public.hundred_year_scenarios TO service_role;
ALTER TABLE public.hundred_year_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage 100yr scenarios" ON public.hundred_year_scenarios FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_hys_updated_at BEFORE UPDATE ON public.hundred_year_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_hys_household ON public.hundred_year_scenarios(household_id) WHERE deleted_at IS NULL;

-- 11. FAMILY CFO REPORTS
CREATE TABLE public.family_cfo_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  report_month DATE NOT NULL,
  net_worth NUMERIC DEFAULT 0,
  cash_flow NUMERIC DEFAULT 0,
  investment_growth NUMERIC DEFAULT 0,
  debt_reduction NUMERIC DEFAULT 0,
  legacy_worth NUMERIC DEFAULT 0,
  legacy_worth_delta NUMERIC DEFAULT 0,
  sections JSONB NOT NULL DEFAULT '{}'::jsonb, -- {trust_projection, tax_opportunities, insurance_review, allocation, risks, next_best_move, high_impact_action}
  emailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_cfo_reports TO authenticated;
GRANT ALL ON public.family_cfo_reports TO service_role;
ALTER TABLE public.family_cfo_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members read cfo reports" ON public.family_cfo_reports FOR SELECT TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Service role writes cfo reports" ON public.family_cfo_reports FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE UNIQUE INDEX ux_cfo_household_month ON public.family_cfo_reports(household_id, report_month);

-- ============================================================
-- Column extensions on existing tables
-- ============================================================
ALTER TABLE public.paycheck_deployment_rules
  ADD COLUMN IF NOT EXISTS kungfoo_step TEXT,
  ADD COLUMN IF NOT EXISTS dynamic_priority INTEGER,
  ADD COLUMN IF NOT EXISTS ai_rationale TEXT;

ALTER TABLE public.purchase_guard_checks
  ADD COLUMN IF NOT EXISTS is_emotional BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS needwant TEXT,
  ADD COLUMN IF NOT EXISTS future_you_answer TEXT,
  ADD COLUMN IF NOT EXISTS legacy_impact_ack BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_pattern_flag BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS days_delayed_freedom NUMERIC,
  ADD COLUMN IF NOT EXISTS legacy_worth_delta NUMERIC;
