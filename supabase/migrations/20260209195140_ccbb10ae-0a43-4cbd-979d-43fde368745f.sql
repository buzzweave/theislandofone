
-- Create a site_settings table to store global settings like logo
CREATE TABLE public.site_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view site settings"
  ON public.site_settings FOR SELECT
  USING (true);

-- Allow all operations for now (admin auth will be added later)
CREATE POLICY "Allow updating site settings"
  ON public.site_settings FOR UPDATE
  USING (true);

CREATE POLICY "Allow inserting site settings"
  ON public.site_settings FOR INSERT
  WITH CHECK (true);

-- Seed default logo setting
INSERT INTO public.site_settings (key, value) VALUES ('logo_url', '');

-- Create a storage bucket for site assets like logos
INSERT INTO storage.buckets (id, name, public) VALUES ('site-assets', 'site-assets', true);

-- Storage policies for site-assets bucket
CREATE POLICY "Anyone can view site assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-assets');

CREATE POLICY "Allow uploading site assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'site-assets');

CREATE POLICY "Allow updating site assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'site-assets');

CREATE POLICY "Allow deleting site assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'site-assets');
