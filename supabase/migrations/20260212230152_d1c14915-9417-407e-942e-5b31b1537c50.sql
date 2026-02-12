
-- Track book publishing status per platform
CREATE TABLE public.book_publish_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('apple_books', 'amazon_kdp')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'formatting', 'ready', 'submitted', 'live', 'rejected')),
  store_url TEXT DEFAULT '',
  submitted_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(book_id, platform)
);

-- Enable RLS
ALTER TABLE public.book_publish_records ENABLE ROW LEVEL SECURITY;

-- Only admins can manage publish records
CREATE POLICY "Admins can view publish records"
ON public.book_publish_records FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert publish records"
ON public.book_publish_records FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update publish records"
ON public.book_publish_records FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete publish records"
ON public.book_publish_records FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_book_publish_records_updated_at
BEFORE UPDATE ON public.book_publish_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
