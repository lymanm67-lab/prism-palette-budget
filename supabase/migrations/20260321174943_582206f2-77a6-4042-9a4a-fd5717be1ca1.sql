
-- A/B Testing Framework Tables

-- Experiments table
CREATE TABLE public.ab_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  target_element text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  required_sample_size integer NOT NULL DEFAULT 1000,
  started_at timestamptz,
  ended_at timestamptz,
  winner_variant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Variants table
CREATE TABLE public.ab_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  name text NOT NULL,
  variant_key text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  is_control boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Events table (anonymous tracking)
CREATE TABLE public.ab_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES public.ab_variants(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_ab_events_experiment ON public.ab_events(experiment_id);
CREATE INDEX idx_ab_events_variant ON public.ab_events(variant_id);
CREATE INDEX idx_ab_events_visitor ON public.ab_events(visitor_id);
CREATE INDEX idx_ab_events_type ON public.ab_events(event_type);
CREATE INDEX idx_ab_variants_experiment ON public.ab_variants(experiment_id);
CREATE INDEX idx_ab_experiments_status ON public.ab_experiments(status);

-- Enable RLS
ALTER TABLE public.ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_events ENABLE ROW LEVEL SECURITY;

-- Experiments: admins can manage, anyone can read active
CREATE POLICY "Anyone can read active experiments"
ON public.ab_experiments FOR SELECT
USING (status = 'running');

CREATE POLICY "Admins can manage experiments"
ON public.ab_experiments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Variants: anyone can read variants of active experiments
CREATE POLICY "Anyone can read active variants"
ON public.ab_variants FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.ab_experiments e
  WHERE e.id = experiment_id AND e.status = 'running'
));

CREATE POLICY "Admins can manage variants"
ON public.ab_variants FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Events: anyone can insert (anonymous visitors), admins can read
CREATE POLICY "Anyone can insert events"
ON public.ab_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can read events"
ON public.ab_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_ab_experiments_updated_at
BEFORE UPDATE ON public.ab_experiments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Aggregation view for experiment results
CREATE OR REPLACE VIEW public.ab_experiment_results AS
SELECT
  e.id AS experiment_id,
  e.name AS experiment_name,
  e.status,
  v.id AS variant_id,
  v.name AS variant_name,
  v.variant_key,
  v.is_control,
  COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.event_type = 'impression') AS impressions,
  COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.event_type = 'click') AS clicks,
  COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.event_type = 'conversion') AS conversions,
  CASE
    WHEN COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.event_type = 'impression') > 0
    THEN ROUND(
      COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.event_type = 'conversion')::numeric /
      COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.event_type = 'impression')::numeric * 100, 2
    )
    ELSE 0
  END AS conversion_rate,
  CASE
    WHEN COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.event_type = 'impression') > 0
    THEN ROUND(
      COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.event_type = 'click')::numeric /
      COUNT(DISTINCT ev.visitor_id) FILTER (WHERE ev.event_type = 'impression')::numeric * 100, 2
    )
    ELSE 0
  END AS click_through_rate
FROM public.ab_experiments e
JOIN public.ab_variants v ON v.experiment_id = e.id
LEFT JOIN public.ab_events ev ON ev.variant_id = v.id
GROUP BY e.id, e.name, e.status, v.id, v.name, v.variant_key, v.is_control;
