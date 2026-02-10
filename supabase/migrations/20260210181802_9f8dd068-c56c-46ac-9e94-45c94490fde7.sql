
-- Create sermons table
CREATE TABLE public.sermons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  scripture text NOT NULL DEFAULT '',
  excerpt text NOT NULL DEFAULT '',
  manuscript text NOT NULL DEFAULT '',
  access_level text NOT NULL DEFAULT 'free',
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'Faith',
  price numeric NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT true,
  preview_cutoff integer NOT NULL DEFAULT 2,
  featured boolean NOT NULL DEFAULT false,
  audio_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;

-- Anyone can view sermons
CREATE POLICY "Anyone can view sermons"
  ON public.sermons FOR SELECT
  USING (true);

-- Admins can insert sermons
CREATE POLICY "Admins can insert sermons"
  ON public.sermons FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update sermons
CREATE POLICY "Admins can update sermons"
  ON public.sermons FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete sermons
CREATE POLICY "Admins can delete sermons"
  ON public.sermons FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_sermons_updated_at
  BEFORE UPDATE ON public.sermons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
