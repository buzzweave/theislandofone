
-- Storage delete policy for graphics bucket (may already exist, use IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete graphics files' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Admins can delete graphics files"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'graphics' AND public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
