
-- Allow uploads to graphics storage bucket
CREATE POLICY "Allow graphics file uploads"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'graphics');

-- Allow deleting graphics files
CREATE POLICY "Allow graphics file deletes"
ON storage.objects
FOR DELETE
USING (bucket_id = 'graphics');

-- Allow inserting graphics records
CREATE POLICY "Allow inserting graphics"
ON public.graphics
FOR INSERT
WITH CHECK (true);

-- Allow updating graphics records
CREATE POLICY "Allow updating graphics"
ON public.graphics
FOR UPDATE
USING (true);

-- Allow deleting graphics records
CREATE POLICY "Allow deleting graphics"
ON public.graphics
FOR DELETE
USING (true);
