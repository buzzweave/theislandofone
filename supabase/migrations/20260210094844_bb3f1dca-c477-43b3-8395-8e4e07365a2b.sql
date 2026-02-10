
-- Fix blog_posts: admin-only for INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Allow deleting blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow inserting blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow updating blog posts" ON public.blog_posts;

CREATE POLICY "Admins can insert blog posts"
  ON public.blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update blog posts"
  ON public.blog_posts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blog posts"
  ON public.blog_posts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix graphics: admin-only
DROP POLICY IF EXISTS "Allow deleting graphics" ON public.graphics;
DROP POLICY IF EXISTS "Allow inserting graphics" ON public.graphics;
DROP POLICY IF EXISTS "Allow updating graphics" ON public.graphics;

CREATE POLICY "Admins can insert graphics"
  ON public.graphics FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update graphics"
  ON public.graphics FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete graphics"
  ON public.graphics FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix site_settings: admin-only
DROP POLICY IF EXISTS "Allow inserting site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow updating site settings" ON public.site_settings;

CREATE POLICY "Admins can insert site settings"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update site settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix speaking_requests INSERT: keep open for anonymous/public form submissions
DROP POLICY IF EXISTS "Anyone can insert speaking requests" ON public.speaking_requests;

CREATE POLICY "Anyone can insert speaking requests"
  ON public.speaking_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
