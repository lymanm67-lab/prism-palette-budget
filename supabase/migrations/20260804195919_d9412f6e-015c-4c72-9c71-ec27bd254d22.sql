-- HEALTH PROFILE
CREATE TABLE public.health_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL DEFAULT 'Lyman',
  birth_date DATE,
  height_inches NUMERIC DEFAULT 70,
  start_weight NUMERIC NOT NULL DEFAULT 220,
  current_weight NUMERIC NOT NULL DEFAULT 220,
  goal_weight NUMERIC NOT NULL DEFAULT 160,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE,
  waist_inches NUMERIC,
  body_fat_pct NUMERIC,
  sex TEXT DEFAULT 'male',
  daily_miles_goal NUMERIC NOT NULL DEFAULT 3.5,
  walk_days_per_week INTEGER NOT NULL DEFAULT 6,
  protein_goal_g NUMERIC NOT NULL DEFAULT 140,
  water_goal_oz NUMERIC NOT NULL DEFAULT 100,
  veg_goal_servings NUMERIC NOT NULL DEFAULT 5,
  fruit_goal_servings NUMERIC NOT NULL DEFAULT 2,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_profile TO authenticated;
GRANT ALL ON public.health_profile TO service_role;
ALTER TABLE public.health_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hp_household_all" ON public.health_profile FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_health_profile_updated BEFORE UPDATE ON public.health_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DAILY LOGS
CREATE TABLE public.health_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  miles NUMERIC NOT NULL DEFAULT 0,
  steps INTEGER,
  active_minutes INTEGER,
  minutes_walked NUMERIC,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  water_oz NUMERIC NOT NULL DEFAULT 0,
  veg_servings NUMERIC NOT NULL DEFAULT 0,
  fruit_servings NUMERIC NOT NULL DEFAULT 0,
  avoided_processed_carbs BOOLEAN NOT NULL DEFAULT false,
  avoided_sugary_drinks BOOLEAN NOT NULL DEFAULT false,
  weight NUMERIC,
  sleep_hours NUMERIC,
  energy_rating INTEGER,
  focus_rating INTEGER,
  stress_rating INTEGER,
  mood_rating INTEGER,
  revenue_amount NUMERIC,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_daily_logs TO authenticated;
GRANT ALL ON public.health_daily_logs TO service_role;
ALTER TABLE public.health_daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hdl_household_all" ON public.health_daily_logs FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_health_daily_logs_updated BEFORE UPDATE ON public.health_daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_hdl_household_date ON public.health_daily_logs (household_id, log_date DESC);

-- VITALS
CREATE TABLE public.health_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  measured_on DATE NOT NULL DEFAULT CURRENT_DATE,
  systolic INTEGER,
  diastolic INTEGER,
  resting_heart_rate INTEGER,
  glucose NUMERIC,
  a1c NUMERIC,
  total_cholesterol NUMERIC,
  ldl NUMERIC,
  hdl NUMERIC,
  triglycerides NUMERIC,
  waist_inches NUMERIC,
  body_fat_pct NUMERIC,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_vitals TO authenticated;
GRANT ALL ON public.health_vitals TO service_role;
ALTER TABLE public.health_vitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hv_household_all" ON public.health_vitals FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_health_vitals_updated BEFORE UPDATE ON public.health_vitals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MILESTONES
CREATE TABLE public.health_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  weight_target NUMERIC NOT NULL,
  estimated_date DATE,
  actual_date DATE,
  reward TEXT,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, weight_target)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_milestones TO authenticated;
GRANT ALL ON public.health_milestones TO service_role;
ALTER TABLE public.health_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hm_household_all" ON public.health_milestones FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_health_milestones_updated BEFORE UPDATE ON public.health_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ACHIEVEMENTS
CREATE TABLE public.health_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  label TEXT NOT NULL,
  earned_on DATE NOT NULL DEFAULT CURRENT_DATE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, badge_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_achievements TO authenticated;
GRANT ALL ON public.health_achievements TO service_role;
ALTER TABLE public.health_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ha_household_all" ON public.health_achievements FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_health_achievements_updated BEFORE UPDATE ON public.health_achievements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MEALS
CREATE TABLE public.health_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL DEFAULT 'power_bowl',
  name TEXT,
  components JSONB NOT NULL DEFAULT '{}'::jsonb,
  calories NUMERIC,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fiber_g NUMERIC,
  fat_g NUMERIC,
  is_template BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_meals TO authenticated;
GRANT ALL ON public.health_meals TO service_role;
ALTER TABLE public.health_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hml_household_all" ON public.health_meals FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_health_meals_updated BEFORE UPDATE ON public.health_meals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MEAL PREP SESSIONS
CREATE TABLE public.health_meal_prep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  prep_date DATE NOT NULL DEFAULT CURRENT_DATE,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  shopping_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  containers_packed INTEGER NOT NULL DEFAULT 0,
  meals_consumed INTEGER NOT NULL DEFAULT 0,
  grocery_cost NUMERIC,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_meal_prep TO authenticated;
GRANT ALL ON public.health_meal_prep TO service_role;
ALTER TABLE public.health_meal_prep ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hmp_household_all" ON public.health_meal_prep FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_health_meal_prep_updated BEFORE UPDATE ON public.health_meal_prep
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- COACH REPORTS
CREATE TABLE public.health_coach_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL DEFAULT 'daily',
  period_label TEXT,
  content TEXT NOT NULL,
  metrics JSONB,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_coach_reports TO authenticated;
GRANT ALL ON public.health_coach_reports TO service_role;
ALTER TABLE public.health_coach_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hcr_household_all" ON public.health_coach_reports FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER trg_health_coach_reports_updated BEFORE UPDATE ON public.health_coach_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();