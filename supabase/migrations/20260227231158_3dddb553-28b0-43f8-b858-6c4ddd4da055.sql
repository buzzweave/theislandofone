
-- Goal 4: Content categories for Books and Sermons
CREATE TABLE public.content_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('book', 'sermon')),
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique slug per type
CREATE UNIQUE INDEX idx_content_categories_type_slug ON public.content_categories (type, slug);

ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.content_categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON public.content_categories FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update categories" ON public.content_categories FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete categories" ON public.content_categories FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default book categories
INSERT INTO public.content_categories (type, name, slug) VALUES
  ('book', 'Devotional', 'devotional'),
  ('book', 'Faith', 'faith'),
  ('book', 'Leadership', 'leadership'),
  ('book', 'Ministry', 'ministry'),
  ('book', 'Prayer', 'prayer'),
  ('book', 'Family', 'family');

-- Seed default sermon categories
INSERT INTO public.content_categories (type, name, slug) VALUES
  ('sermon', 'Faith', 'faith'),
  ('sermon', 'Worship', 'worship'),
  ('sermon', 'Calling', 'calling'),
  ('sermon', 'Leadership', 'leadership'),
  ('sermon', 'Deliverance', 'deliverance'),
  ('sermon', 'Prayer', 'prayer'),
  ('sermon', 'Family', 'family');

-- Add updated_at trigger
CREATE TRIGGER update_content_categories_updated_at
  BEFORE UPDATE ON public.content_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
