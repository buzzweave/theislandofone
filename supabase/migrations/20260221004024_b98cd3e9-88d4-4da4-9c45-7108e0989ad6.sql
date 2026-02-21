
CREATE TABLE public.content_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  fb_user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.content_reviews FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reviews" ON public.content_reviews FOR INSERT WITH CHECK (true);

CREATE INDEX idx_content_reviews_lookup ON public.content_reviews (content_type, content_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.content_reviews;
