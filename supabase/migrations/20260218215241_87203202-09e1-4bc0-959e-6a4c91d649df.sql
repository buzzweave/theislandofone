-- Add unique constraint on slug for upsert support
ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_slug_unique UNIQUE (slug);
