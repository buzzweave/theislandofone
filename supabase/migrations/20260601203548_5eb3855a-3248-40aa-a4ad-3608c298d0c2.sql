
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

DROP POLICY IF EXISTS "Anyone can read public site settings" ON public.site_settings;
CREATE POLICY "Anyone can read public site settings"
ON public.site_settings FOR SELECT
USING (key = ANY (ARRAY['studio_landing_enabled','site_name','site_description','sermons_enabled','allow_registrations','maintenance_mode']));
