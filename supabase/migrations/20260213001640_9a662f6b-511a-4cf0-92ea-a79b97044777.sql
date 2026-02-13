
-- Create audiobooks table
CREATE TABLE public.audiobooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('book', 'sermon')),
  content_id UUID NOT NULL,
  audio_url TEXT NOT NULL DEFAULT '',
  voice_provider TEXT NOT NULL DEFAULT 'elevenlabs' CHECK (voice_provider IN ('elevenlabs', 'openai')),
  voice_id TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  is_separate_price BOOLEAN NOT NULL DEFAULT false,
  is_visible BOOLEAN NOT NULL DEFAULT false,
  title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (content_type, content_id)
);

-- Enable RLS
ALTER TABLE public.audiobooks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view visible audiobooks"
ON public.audiobooks FOR SELECT
USING (is_visible = true);

CREATE POLICY "Admins can view all audiobooks"
ON public.audiobooks FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert audiobooks"
ON public.audiobooks FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update audiobooks"
ON public.audiobooks FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete audiobooks"
ON public.audiobooks FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_audiobooks_updated_at
BEFORE UPDATE ON public.audiobooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
