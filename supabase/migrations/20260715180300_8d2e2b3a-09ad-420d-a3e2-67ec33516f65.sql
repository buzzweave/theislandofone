
ALTER TABLE public.immersive_experiences
  ADD COLUMN IF NOT EXISTS runtime_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS trailer_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_scripture TEXT;

ALTER TABLE public.experience_series
  ADD COLUMN IF NOT EXISTS is_current_series BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_experience_id UUID REFERENCES public.immersive_experiences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS homepage_visible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_on_watch BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS homepage_headline TEXT,
  ADD COLUMN IF NOT EXISTS homepage_description TEXT,
  ADD COLUMN IF NOT EXISTS homepage_artwork_url TEXT,
  ADD COLUMN IF NOT EXISTS homepage_mobile_artwork_url TEXT,
  ADD COLUMN IF NOT EXISTS homepage_preview_video_url TEXT,
  ADD COLUMN IF NOT EXISTS trailer_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_watch_label TEXT,
  ADD COLUMN IF NOT EXISTS secondary_watch_label TEXT,
  ADD COLUMN IF NOT EXISTS display_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS display_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured_priority INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS one_current_series
  ON public.experience_series ((is_current_series))
  WHERE is_current_series = true;

CREATE OR REPLACE FUNCTION public.enforce_single_current_series()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_current_series = true THEN
    UPDATE public.experience_series
       SET is_current_series = false
     WHERE id <> NEW.id
       AND is_current_series = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_current_series ON public.experience_series;
CREATE TRIGGER trg_enforce_single_current_series
BEFORE INSERT OR UPDATE OF is_current_series ON public.experience_series
FOR EACH ROW
WHEN (NEW.is_current_series = true)
EXECUTE FUNCTION public.enforce_single_current_series();
