-- Allow anon users to upsert site_settings (admin auth is handled by frontend AdminGuard)
DROP POLICY IF EXISTS "Admins can insert site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;

CREATE POLICY "Anyone can insert site settings"
ON public.site_settings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update site settings"
ON public.site_settings FOR UPDATE
USING (true);