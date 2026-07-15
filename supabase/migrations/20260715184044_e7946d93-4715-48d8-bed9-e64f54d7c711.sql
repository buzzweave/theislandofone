DROP POLICY IF EXISTS "Admins manage workspace media" ON storage.objects;
CREATE POLICY "Admins manage workspace media"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'workspace-media' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'workspace-media' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public read experience media" ON storage.objects;
CREATE POLICY "Public read experience media"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'workspace-media'
  AND (storage.foldername(name))[1] = 'experiences'
);