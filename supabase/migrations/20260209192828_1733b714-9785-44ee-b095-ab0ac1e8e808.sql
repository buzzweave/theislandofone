
-- Create graphics table
CREATE TABLE public.graphics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  preview_url TEXT NOT NULL,
  file_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.graphics ENABLE ROW LEVEL SECURITY;

-- Anyone can view active graphics (preview)
CREATE POLICY "Anyone can view active graphics"
ON public.graphics
FOR SELECT
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_graphics_updated_at
BEFORE UPDATE ON public.graphics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for graphics files
INSERT INTO storage.buckets (id, name, public) VALUES ('graphics', 'graphics', true);

-- Public read access for graphics bucket
CREATE POLICY "Anyone can view graphics files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'graphics');
