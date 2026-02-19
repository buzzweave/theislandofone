
-- Forum Categories
CREATE TABLE public.forum_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  slug text NOT NULL UNIQUE,
  tier_required text NOT NULL DEFAULT 'reader',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories" ON public.forum_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage categories" ON public.forum_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Forum Posts
CREATE TABLE public.forum_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view posts" ON public.forum_posts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create own posts" ON public.forum_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON public.forum_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON public.forum_posts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage posts" ON public.forum_posts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Forum Replies
CREATE TABLE public.forum_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view replies" ON public.forum_replies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create own replies" ON public.forum_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies" ON public.forum_replies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies" ON public.forum_replies
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage replies" ON public.forum_replies
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_forum_replies_updated_at
  BEFORE UPDATE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed categories
INSERT INTO public.forum_categories (name, description, slug, tier_required, sort_order) VALUES
  ('General Discussion', 'Open conversations about faith, life, and community.', 'general', 'reader', 1),
  ('Prayer Requests', 'Share your prayer needs and pray for others.', 'prayer', 'reader', 2),
  ('Bible Study', 'Discuss scripture, lessons, and study resources.', 'bible-study', 'reader', 3),
  ('Ministry Questions', 'Ask questions about ministry leadership and challenges.', 'ministry', 'pastor', 4),
  ('Pastor Resources', 'Share and discover resources for pastors.', 'pastor-resources', 'pastor', 5),
  ('Leadership Support', 'Encouragement and guidance for ministry leaders.', 'leadership', 'pastor', 6);
