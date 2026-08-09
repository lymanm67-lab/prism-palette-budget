UPDATE public.health_daily_logs
SET workout_sessions = (
  SELECT jsonb_agg(
    CASE WHEN s ? 'kind' THEN s ELSE s || jsonb_build_object('kind','strength') END
  )
  FROM jsonb_array_elements(workout_sessions) AS s
)
WHERE workout_sessions IS NOT NULL
  AND jsonb_typeof(workout_sessions) = 'array'
  AND jsonb_array_length(workout_sessions) > 0
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(workout_sessions) AS s WHERE NOT (s ? 'kind')
  );