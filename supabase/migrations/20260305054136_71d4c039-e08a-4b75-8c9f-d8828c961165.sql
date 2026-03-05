-- Create a public storage bucket for legal documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-documents', 'legal-documents', true);

-- Allow anyone to read legal documents
CREATE POLICY "Public read access for legal documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'legal-documents');

-- Allow authenticated users to upload legal documents
CREATE POLICY "Authenticated users can upload legal documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'legal-documents');