INSERT INTO storage.buckets (id, name, public) VALUES ('downloads', 'downloads', true);

CREATE POLICY "Anyone can read downloads" ON storage.objects FOR SELECT USING (bucket_id = 'downloads');
CREATE POLICY "Anyone can upload downloads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'downloads');
CREATE POLICY "Anyone can delete downloads" ON storage.objects FOR DELETE USING (bucket_id = 'downloads');