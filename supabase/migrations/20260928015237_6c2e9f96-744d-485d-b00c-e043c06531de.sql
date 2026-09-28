DROP POLICY IF EXISTS "Authenticated can create household" ON public.households;
REVOKE INSERT ON public.households FROM authenticated;

DROP POLICY IF EXISTS "Signed-in users can read provider status" ON public.se_api_provider_status;
CREATE POLICY "Household members can read provider status"
  ON public.se_api_provider_status
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.household_members hm
      WHERE hm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Signed-in users can read market candles" ON public.se_market_data_cache;
CREATE POLICY "Household members can read market candles"
  ON public.se_market_data_cache
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.household_members hm
      WHERE hm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Signed-in users can read symbols" ON public.se_market_symbols;
CREATE POLICY "Household members can read symbols"
  ON public.se_market_symbols
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.household_members hm
      WHERE hm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can read site content" ON public.site_content;
CREATE POLICY "Anyone can read published site content"
  ON public.site_content
  FOR SELECT TO anon, authenticated
  USING (
    key IS NOT NULL
    AND btrim(key) <> ''
    AND value IS NOT NULL
    AND btrim(value) <> ''
    AND kind IN ('text', 'longtext', 'image')
  );

DROP POLICY IF EXISTS "Signed in users can read site images" ON storage.objects;
CREATE POLICY "Admins can read site images"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'site-images'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'founder')
    )
  );