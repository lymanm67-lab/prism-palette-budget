CREATE POLICY "Admins can upload site images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder')));

CREATE POLICY "Admins can update site images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder')));

CREATE POLICY "Admins can delete site images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder')));

CREATE POLICY "Signed in users can read site images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'site-images');