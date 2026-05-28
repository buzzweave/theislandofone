-- site_settings: remove blanket public SELECT, keep allowlist
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;

-- graphics bucket: remove anonymous write/update
DROP POLICY IF EXISTS "Anyone can upload graphics files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update graphics files" ON storage.objects;

-- downloads bucket: remove fully-open write/delete, restrict to admins
DROP POLICY IF EXISTS "Anyone can upload downloads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete downloads" ON storage.objects;

CREATE POLICY "Admins can upload downloads"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'downloads'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can update downloads"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'downloads'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can delete downloads"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'downloads'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- workspace-media bucket: scope writes/deletes to org membership
-- File path convention: <org_id>/<rest-of-path>
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own media" ON storage.objects;

CREATE POLICY "Org members can upload workspace media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'workspace-media'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can delete workspace media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'workspace-media'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM public.organization_members WHERE user_id = auth.uid()
    )
  );