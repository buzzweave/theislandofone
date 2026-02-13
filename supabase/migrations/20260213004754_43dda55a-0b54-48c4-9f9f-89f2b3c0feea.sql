-- Allow anyone to upload to graphics bucket (bucket is already public)
CREATE POLICY "Anyone can upload graphics files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'graphics');

-- Allow anyone to update graphics files
CREATE POLICY "Anyone can update graphics files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'graphics');
