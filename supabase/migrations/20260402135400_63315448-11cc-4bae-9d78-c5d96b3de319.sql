
ALTER TABLE public.audiobooks
  ADD COLUMN IF NOT EXISTS cover_image text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT true;
