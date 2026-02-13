-- Add price and is_free columns to videos table for selling videos
ALTER TABLE public.videos ADD COLUMN price numeric NOT NULL DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN is_free boolean NOT NULL DEFAULT true;