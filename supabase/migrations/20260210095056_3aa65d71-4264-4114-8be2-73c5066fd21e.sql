
-- Add explicit admin-only policies for hero_banners
CREATE POLICY "Admins can insert hero banners"
  ON public.hero_banners FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update hero banners"
  ON public.hero_banners FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete hero banners"
  ON public.hero_banners FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add explicit admin-only policies for membership_plans
CREATE POLICY "Admins can insert membership plans"
  ON public.membership_plans FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update membership plans"
  ON public.membership_plans FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete membership plans"
  ON public.membership_plans FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix storage: replace open policies with admin-only

-- blog-images
DROP POLICY IF EXISTS "Allow uploading blog images" ON storage.objects;
DROP POLICY IF EXISTS "Allow updating blog images" ON storage.objects;
DROP POLICY IF EXISTS "Allow deleting blog images" ON storage.objects;

CREATE POLICY "Admins can upload blog images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update blog images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blog images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

-- graphics
DROP POLICY IF EXISTS "Allow graphics file uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow graphics file deletes" ON storage.objects;

CREATE POLICY "Admins can upload graphics files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'graphics' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete graphics files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'graphics' AND public.has_role(auth.uid(), 'admin'));

-- site-assets
DROP POLICY IF EXISTS "Allow uploading site assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow updating site assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow deleting site assets" ON storage.objects;

CREATE POLICY "Admins can upload site assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update site assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete site assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));

-- video-thumbnails
DROP POLICY IF EXISTS "Allow uploading video thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow updating video thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow deleting video thumbnails" ON storage.objects;

CREATE POLICY "Admins can upload video thumbnails" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'video-thumbnails' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update video thumbnails" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'video-thumbnails' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete video thumbnails" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'video-thumbnails' AND public.has_role(auth.uid(), 'admin'));

-- audio-files
DROP POLICY IF EXISTS "Allow uploading audio files" ON storage.objects;
DROP POLICY IF EXISTS "Allow deleting audio files" ON storage.objects;

CREATE POLICY "Admins can upload audio files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete audio files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'audio-files' AND public.has_role(auth.uid(), 'admin'));

-- hero-banners storage
DROP POLICY IF EXISTS "Authenticated users can upload hero banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update hero banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete hero banners" ON storage.objects;

CREATE POLICY "Admins can upload hero banners" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hero-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update hero banners" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'hero-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete hero banners" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'hero-banners' AND public.has_role(auth.uid(), 'admin'));
