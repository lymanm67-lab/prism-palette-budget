CREATE POLICY "medical_docs_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'medical-documents' AND public.is_household_member(auth.uid(), (storage.foldername(name))[1]::uuid));
CREATE POLICY "medical_docs_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medical-documents' AND public.is_household_member(auth.uid(), (storage.foldername(name))[1]::uuid));
CREATE POLICY "medical_docs_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'medical-documents' AND public.is_household_member(auth.uid(), (storage.foldername(name))[1]::uuid));
CREATE POLICY "medical_docs_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'medical-documents' AND public.is_household_member(auth.uid(), (storage.foldername(name))[1]::uuid));