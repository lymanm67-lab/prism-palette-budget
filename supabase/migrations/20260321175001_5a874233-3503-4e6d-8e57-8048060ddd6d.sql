
-- Fix 1: Drop and recreate view without SECURITY DEFINER
DROP VIEW IF EXISTS public.ab_experiment_results;
CREATE VIEW public.ab_experiment_results WITH (security_invoker = true) AS
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

-- Fix 2: Restrict event inserts to only active experiments
DROP POLICY "Anyone can insert events" ON public.ab_events;
CREATE POLICY "Anyone can insert events for active experiments"
ON public.ab_events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ab_experiments e
    WHERE e.id = experiment_id AND e.status = 'running'
  )
);
