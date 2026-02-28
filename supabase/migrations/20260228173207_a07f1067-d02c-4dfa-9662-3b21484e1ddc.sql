
-- Video Studio projects table
CREATE TABLE public.video_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'book', -- book, sermon, devotional, custom
  content_id UUID,
  custom_text TEXT DEFAULT '',
  voice_provider TEXT NOT NULL DEFAULT 'openai', -- openai, elevenlabs
  voice_id TEXT NOT NULL DEFAULT 'onyx',
  tone TEXT NOT NULL DEFAULT 'cinematic', -- preaching, cinematic, devotional, documentary
  audio_url TEXT DEFAULT '',
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  video_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft', -- draft, generating_audio, building_slides, rendering, completed, failed
  viral_mode BOOLEAN NOT NULL DEFAULT false,
  music_style TEXT DEFAULT '',
  effects JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_format TEXT NOT NULL DEFAULT '16:9', -- 16:9, 9:16, 1:1
  error_message TEXT DEFAULT '',
  prompt TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.video_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage video_projects" ON public.video_projects
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_video_projects_updated_at
  BEFORE UPDATE ON public.video_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
