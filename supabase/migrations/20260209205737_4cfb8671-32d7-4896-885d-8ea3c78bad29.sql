
-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', true);

-- Allow anyone to read audio files
CREATE POLICY "Anyone can view audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-files');

-- Allow authenticated users to upload audio files
CREATE POLICY "Allow uploading audio files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-files');

-- Allow authenticated users to delete audio files
CREATE POLICY "Allow deleting audio files"
ON storage.objects FOR DELETE
USING (bucket_id = 'audio-files');
