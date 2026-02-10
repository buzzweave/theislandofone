
INSERT INTO storage.buckets (id, name, public) VALUES ('video-thumbnails', 'video-thumbnails', true);

CREATE POLICY "Anyone can view video thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'video-thumbnails');
CREATE POLICY "Allow uploading video thumbnails" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'video-thumbnails');
CREATE POLICY "Allow updating video thumbnails" ON storage.objects FOR UPDATE USING (bucket_id = 'video-thumbnails');
CREATE POLICY "Allow deleting video thumbnails" ON storage.objects FOR DELETE USING (bucket_id = 'video-thumbnails');
