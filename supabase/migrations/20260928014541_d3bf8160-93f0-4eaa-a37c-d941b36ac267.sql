DROP POLICY IF EXISTS "Signed-in members can read the shared figures cache" ON public.se_fundamental_cache;
CREATE POLICY "Signed-in members can read identified shared figures"
ON public.se_fundamental_cache
FOR SELECT
TO authenticated
USING (
  length(btrim(symbol)) > 0
  AND length(btrim(provider)) > 0
  AND length(btrim(asset_type)) > 0
);