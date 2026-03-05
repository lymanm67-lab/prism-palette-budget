
-- Add receipt_url column to transactions
ALTER TABLE public.transactions ADD COLUMN receipt_url text;

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('receipts', 'receipts', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow authenticated users to upload to their household folder
CREATE POLICY "Users can upload receipts to their household folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT hm.household_id::text FROM public.household_members hm WHERE hm.user_id = auth.uid()
  )
);

-- Storage RLS: allow users to read receipts from their household
CREATE POLICY "Users can read their household receipts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT hm.household_id::text FROM public.household_members hm WHERE hm.user_id = auth.uid()
  )
);

-- Storage RLS: allow users to delete their household receipts
CREATE POLICY "Users can delete their household receipts"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT hm.household_id::text FROM public.household_members hm WHERE hm.user_id = auth.uid()
  )
);
