-- Allow anonymous uploads to the downloads bucket (temporary files for iOS download)
DROP POLICY IF EXISTS "Authenticated users can upload downloads" ON storage.objects;
CREATE POLICY "Anyone can upload downloads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'downloads');

-- Allow anyone to delete (cleanup)
DROP POLICY IF EXISTS "Authenticated users can delete downloads" ON storage.objects;
CREATE POLICY "Anyone can delete downloads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'downloads');
