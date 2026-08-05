CREATE POLICY "fdn docs read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'foundation-documents' AND public.is_household_member(auth.uid(), ((storage.foldername(name))[1])::uuid));

CREATE POLICY "fdn docs insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'foundation-documents' AND public.is_household_member(auth.uid(), ((storage.foldername(name))[1])::uuid));

CREATE POLICY "fdn docs update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'foundation-documents' AND public.is_household_member(auth.uid(), ((storage.foldername(name))[1])::uuid));

CREATE POLICY "fdn docs delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'foundation-documents' AND public.is_household_member(auth.uid(), ((storage.foldername(name))[1])::uuid));