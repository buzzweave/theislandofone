
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  thumbnail TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '0:00',
  category TEXT NOT NULL DEFAULT 'Ministry',
  featured BOOLEAN NOT NULL DEFAULT false,
  youtube_url TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active videos" ON public.videos
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow inserting videos" ON public.videos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow updating videos" ON public.videos
  FOR UPDATE USING (true);

CREATE POLICY "Allow deleting videos" ON public.videos
  FOR DELETE USING (true);

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
