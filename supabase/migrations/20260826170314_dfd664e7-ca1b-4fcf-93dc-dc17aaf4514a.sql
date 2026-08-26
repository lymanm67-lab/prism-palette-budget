CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.duplicate_detector_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  scan_days integer NOT NULL DEFAULT 30,
  max_clusters integer NOT NULL DEFAULT 25,
  email_enabled boolean NOT NULL DEFAULT false,
  email text,
  last_email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.duplicate_detector_settings TO authenticated;
GRANT ALL ON public.duplicate_detector_settings TO service_role;
ALTER TABLE public.duplicate_detector_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage their household detector settings"
  ON public.duplicate_detector_settings FOR ALL TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));
CREATE TRIGGER update_duplicate_detector_settings_updated_at BEFORE UPDATE ON public.duplicate_detector_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

SELECT cron.unschedule('scheduled-duplicate-detector');

SELECT cron.schedule('scheduled-duplicate-detector', '17 */6 * * *', $job$
WITH settings AS (
  SELECT h.id AS household_id,
         COALESCE(s.scan_days, 30) AS scan_days,
         COALESCE(s.max_clusters, 25) AS max_clusters
  FROM public.households h
  LEFT JOIN public.duplicate_detector_settings s ON s.household_id = h.id
),
clusters AS (
  SELECT t.household_id, t.date, abs(t.amount) AS amt,
         array_agg(t.id ORDER BY t.created_at) AS ids
  FROM public.transactions t
  JOIN settings st ON st.household_id = t.household_id
  WHERE t.deleted_at IS NULL
    AND t.is_transfer = false
    AND t.amount < 0
    AND t.date >= current_date - make_interval(days => st.scan_days)
  GROUP BY t.household_id, t.date, abs(t.amount)
  HAVING count(*) > 1
),
fresh AS (
  SELECT c.household_id, c.ids, st.max_clusters,
         row_number() OVER (PARTITION BY c.household_id ORDER BY c.date DESC) AS rn
  FROM clusters c
  JOIN settings st ON st.household_id = c.household_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categorization_audit a
    WHERE a.rule_key = 'scheduled-duplicate-scan'
      AND a.transaction_id = ANY(c.ids)
  )
),
flagged AS (
  INSERT INTO public.categorization_audit
    (household_id, transaction_id, source, rule_key, rule_name, before_merchant, after_merchant, txn_date, amount)
  SELECT f.household_id, t.id, 'duplicate-scheduler', 'scheduled-duplicate-scan',
         'Scheduled duplicate scan — review cluster', t.merchant, t.merchant, t.date, t.amount
  FROM fresh f
  JOIN public.transactions t ON t.id = ANY(f.ids)
  WHERE f.rn <= f.max_clusters
  RETURNING household_id
)
INSERT INTO public.financial_insights (household_id, message, insight_type, severity, is_read, metadata)
SELECT household_id,
       'Duplicate detector flagged ' || count(*) || ' transaction(s) in new same-day clusters for review.',
       'duplicate_detector',
       'warning',
       false,
       jsonb_build_object('flagged', count(*), 'link', '/cleanup/audit')
FROM flagged
GROUP BY household_id;
$job$);

SELECT cron.schedule('duplicate-detector-email', '23 13 * * *', $job$
  SELECT net.http_post(
    url := 'https://majwbihhjpjbmjawqqcz.supabase.co/functions/v1/duplicate-detector-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1handiaWhoanBqYm1qYXdxcWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NzEyODUsImV4cCI6MjA4ODI0NzI4NX0.R2cDzT2rkMdeAoBeCfzxKTT-0Hv7HPvOT4Mx8E8L-tc"}'::jsonb,
    body := '{}'::jsonb
  );
$job$);