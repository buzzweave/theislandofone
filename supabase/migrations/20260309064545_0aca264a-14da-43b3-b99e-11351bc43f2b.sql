ALTER TABLE public.sermons ADD COLUMN is_published boolean NOT NULL DEFAULT true;

-- AI-generated sermons will set is_published = false explicitly
-- Existing sermons remain published (default true)