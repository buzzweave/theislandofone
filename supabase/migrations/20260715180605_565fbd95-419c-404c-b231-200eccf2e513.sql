
-- Feature/current-series columns on experience_series (idempotent)
ALTER TABLE public.experience_series
  ADD COLUMN IF NOT EXISTS is_current_series boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_experience_id uuid REFERENCES public.immersive_experiences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS homepage_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_on_watch boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS homepage_headline text,
  ADD COLUMN IF NOT EXISTS homepage_description text,
  ADD COLUMN IF NOT EXISTS homepage_artwork_url text,
  ADD COLUMN IF NOT EXISTS homepage_mobile_artwork_url text,
  ADD COLUMN IF NOT EXISTS homepage_preview_video_url text,
  ADD COLUMN IF NOT EXISTS primary_watch_label text,
  ADD COLUMN IF NOT EXISTS secondary_watch_label text,
  ADD COLUMN IF NOT EXISTS display_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS display_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS featured_priority integer NOT NULL DEFAULT 0;

-- Only one primary "current series" at a time
CREATE UNIQUE INDEX IF NOT EXISTS experience_series_current_unique
  ON public.experience_series ((true))
  WHERE is_current_series = true;

-- Optional runtime/preview columns on immersive_experiences (idempotent)
ALTER TABLE public.immersive_experiences
  ADD COLUMN IF NOT EXISTS runtime_seconds integer,
  ADD COLUMN IF NOT EXISTS trailer_url text,
  ADD COLUMN IF NOT EXISTS primary_scripture text;
