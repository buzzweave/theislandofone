
CREATE TABLE public.hero_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  cta_text TEXT DEFAULT 'Explore Books',
  cta_link TEXT DEFAULT '/books',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;

-- Public read for active banners
CREATE POLICY "Anyone can view active hero banners"
  ON public.hero_banners FOR SELECT
  USING (is_active = true);

-- Insert default banner
INSERT INTO public.hero_banners (title, subtitle, image_url, cta_text, cta_link, sort_order) VALUES
  ('The Island of One', 'Empowering believers to stand firm in faith, discover purpose in solitude, and lead with unshakeable conviction.', '', 'Explore Books', '/books', 0);

-- Storage bucket for hero images
INSERT INTO storage.buckets (id, name, public) VALUES ('hero-banners', 'hero-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view hero banner images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hero-banners');

CREATE POLICY "Authenticated users can upload hero banners"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hero-banners');

CREATE POLICY "Authenticated users can update hero banners"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'hero-banners');

CREATE POLICY "Authenticated users can delete hero banners"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'hero-banners');
