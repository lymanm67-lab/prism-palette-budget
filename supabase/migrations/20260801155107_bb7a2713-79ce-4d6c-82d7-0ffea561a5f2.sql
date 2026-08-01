DROP POLICY IF EXISTS "Anyone can insert events for active experiments" ON public.ab_events;

CREATE POLICY "Anyone can insert events for active experiments"
ON public.ab_events
FOR INSERT
TO public
WITH CHECK (
  event_type IN ('impression', 'view', 'click', 'conversion', 'scroll_depth', 'time_on_page')
  AND visitor_id ~ '^[A-Za-z0-9_-]{8,64}$'
  AND (metadata IS NULL OR pg_column_size(metadata) < 2048)
  AND EXISTS (
    SELECT 1
    FROM public.ab_variants v
    JOIN public.ab_experiments e ON e.id = v.experiment_id
    WHERE v.id = ab_events.variant_id
      AND e.id = ab_events.experiment_id
      AND e.status = 'running'
  )
);