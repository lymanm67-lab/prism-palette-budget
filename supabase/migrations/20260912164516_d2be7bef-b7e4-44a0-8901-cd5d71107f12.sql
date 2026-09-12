-- Shared, symbol-level cache of reported figures (not household data).
CREATE TABLE public.se_fundamental_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  asset_type text NOT NULL DEFAULT 'STOCK',
  provider text NOT NULL DEFAULT 'TWELVE_DATA',
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  etf_metrics jsonb,
  sector text,
  industry text,
  company_name text,
  as_of date,
  periods_available integer NOT NULL DEFAULT 0,
  data_mode text NOT NULL DEFAULT 'LIVE',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (symbol, provider)
);
GRANT SELECT ON public.se_fundamental_cache TO authenticated;
GRANT ALL ON public.se_fundamental_cache TO service_role;
ALTER TABLE public.se_fundamental_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in members can read the shared figures cache"
  ON public.se_fundamental_cache FOR SELECT TO authenticated USING (true);

CREATE TABLE public.se_fundamental_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  symbol text NOT NULL,
  score numeric,
  earned_points numeric NOT NULL DEFAULT 0,
  available_points numeric NOT NULL DEFAULT 0,
  coverage numeric NOT NULL DEFAULT 0,
  confidence text NOT NULL DEFAULT 'INSUFFICIENT',
  sector_profile text,
  used_generic_model boolean NOT NULL DEFAULT false,
  fundamental_trend text,
  valuation_class text,
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  red_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_sources text[] NOT NULL DEFAULT '{}',
  data_mode text NOT NULL DEFAULT 'UNAVAILABLE',
  as_of date,
  valid_until timestamptz,
  methodology_version text NOT NULL DEFAULT 'hybrid-1.0.0',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, symbol)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_fundamental_scores TO authenticated;
GRANT ALL ON public.se_fundamental_scores TO service_role;
ALTER TABLE public.se_fundamental_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage their company quality scores"
  ON public.se_fundamental_scores FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE TABLE public.se_etf_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  symbol text NOT NULL,
  score numeric,
  earned_points numeric NOT NULL DEFAULT 0,
  available_points numeric NOT NULL DEFAULT 0,
  coverage numeric NOT NULL DEFAULT 0,
  confidence text NOT NULL DEFAULT 'INSUFFICIENT',
  advanced_product boolean NOT NULL DEFAULT false,
  advanced_reasons text[] NOT NULL DEFAULT '{}',
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_sources text[] NOT NULL DEFAULT '{}',
  data_mode text NOT NULL DEFAULT 'UNAVAILABLE',
  benchmark text,
  as_of date,
  valid_until timestamptz,
  methodology_version text NOT NULL DEFAULT 'hybrid-1.0.0',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, symbol)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_etf_quality_scores TO authenticated;
GRANT ALL ON public.se_etf_quality_scores TO service_role;
ALTER TABLE public.se_etf_quality_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage their fund quality scores"
  ON public.se_etf_quality_scores FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE TABLE public.se_hybrid_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  symbol text NOT NULL,
  asset_type text NOT NULL DEFAULT 'STOCK',
  hybrid_score numeric,
  band text,
  signal text NOT NULL,
  quality_score numeric,
  technical_score numeric,
  risk_score numeric,
  weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  thresholds jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence text NOT NULL DEFAULT 'INSUFFICIENT',
  quality_coverage numeric,
  candle_basis text NOT NULL DEFAULT 'COMPLETED',
  developing boolean NOT NULL DEFAULT false,
  last_completed_candle_at timestamptz,
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocking text[] NOT NULL DEFAULT '{}',
  reasons text[] NOT NULL DEFAULT '{}',
  what_would_change_it text[] NOT NULL DEFAULT '{}',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_sources text[] NOT NULL DEFAULT '{}',
  valid_until timestamptz,
  methodology_version text NOT NULL DEFAULT 'hybrid-1.0.0',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, symbol)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_hybrid_scores TO authenticated;
GRANT ALL ON public.se_hybrid_scores TO service_role;
ALTER TABLE public.se_hybrid_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage their combined signals"
  ON public.se_hybrid_scores FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE TABLE public.se_hybrid_signal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  symbol text NOT NULL,
  from_signal text,
  to_signal text NOT NULL,
  hybrid_score numeric,
  quality_score numeric,
  technical_score numeric,
  risk_score numeric,
  confidence text,
  reason text,
  developing boolean NOT NULL DEFAULT false,
  methodology_version text NOT NULL DEFAULT 'hybrid-1.0.0',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.se_hybrid_signal_history TO authenticated;
GRANT ALL ON public.se_hybrid_signal_history TO service_role;
ALTER TABLE public.se_hybrid_signal_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage their signal history"
  ON public.se_hybrid_signal_history FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE TABLE public.se_signal_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  symbol text NOT NULL,
  conflict_key text NOT NULL,
  label text NOT NULL,
  explanation text NOT NULL,
  severity text NOT NULL DEFAULT 'NOTE',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_signal_conflicts TO authenticated;
GRANT ALL ON public.se_signal_conflicts TO service_role;
ALTER TABLE public.se_signal_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage their signal conflicts"
  ON public.se_signal_conflicts FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE TABLE public.se_fundamental_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  symbol text NOT NULL,
  asset_type text NOT NULL DEFAULT 'STOCK',
  company_name text,
  sector text,
  industry text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  etf_metrics jsonb,
  as_of date,
  periods_available integer NOT NULL DEFAULT 1,
  note text,
  superseded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, symbol)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.se_fundamental_overrides TO authenticated;
GRANT ALL ON public.se_fundamental_overrides TO service_role;
ALTER TABLE public.se_fundamental_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members manage their hand-entered figures"
  ON public.se_fundamental_overrides FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE INDEX idx_se_fundamental_cache_symbol ON public.se_fundamental_cache (symbol);
CREATE INDEX idx_se_fundamental_scores_household ON public.se_fundamental_scores (household_id, symbol);
CREATE INDEX idx_se_etf_quality_scores_household ON public.se_etf_quality_scores (household_id, symbol);
CREATE INDEX idx_se_hybrid_scores_household ON public.se_hybrid_scores (household_id, signal);
CREATE INDEX idx_se_hybrid_history_household ON public.se_hybrid_signal_history (household_id, symbol, created_at DESC);
CREATE INDEX idx_se_signal_conflicts_household ON public.se_signal_conflicts (household_id, symbol);
CREATE INDEX idx_se_fundamental_overrides_household ON public.se_fundamental_overrides (household_id, symbol);

CREATE TRIGGER trg_se_fundamental_cache_updated BEFORE UPDATE ON public.se_fundamental_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_se_fundamental_scores_updated BEFORE UPDATE ON public.se_fundamental_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_se_etf_quality_scores_updated BEFORE UPDATE ON public.se_etf_quality_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_se_hybrid_scores_updated BEFORE UPDATE ON public.se_hybrid_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_se_signal_conflicts_updated BEFORE UPDATE ON public.se_signal_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_se_fundamental_overrides_updated BEFORE UPDATE ON public.se_fundamental_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();