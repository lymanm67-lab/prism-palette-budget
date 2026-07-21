
ALTER TABLE public.legacy_letters
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS shared_with_trust_vault boolean NOT NULL DEFAULT false;

-- Storage RLS: household-scoped access to legacy-letters bucket.
-- Path convention: {household_id}/{...}
CREATE POLICY "Household members can read legacy letter files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'legacy-letters'
    AND public.is_household_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Household members can upload legacy letter files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'legacy-letters'
    AND public.is_household_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Household members can update legacy letter files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'legacy-letters'
    AND public.is_household_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Household members can delete legacy letter files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'legacy-letters'
    AND public.is_household_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
