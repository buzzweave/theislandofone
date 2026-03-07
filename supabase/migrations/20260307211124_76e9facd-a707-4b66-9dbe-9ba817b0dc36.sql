CREATE POLICY "Anyone can read public site settings"
ON public.site_settings
FOR SELECT
USING (key IN ('studio_landing_enabled', 'site_name', 'site_description'));