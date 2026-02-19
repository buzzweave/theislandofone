
ALTER TABLE public.sermons ADD COLUMN access_tiers text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.books ADD COLUMN access_tiers text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.graphics ADD COLUMN access_tiers text[] NOT NULL DEFAULT '{}';
