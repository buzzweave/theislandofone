
-- Speaking requests table
CREATE TABLE public.speaking_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_location TEXT,
  topic TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'completed', 'declined')),
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.speaking_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a speaking request (public form)
CREATE POLICY "Anyone can insert speaking requests"
ON public.speaking_requests
FOR INSERT
WITH CHECK (true);

-- Only authenticated users (admins) can view requests
CREATE POLICY "Authenticated users can view speaking requests"
ON public.speaking_requests
FOR SELECT
TO authenticated
USING (true);

-- Only authenticated users can update requests
CREATE POLICY "Authenticated users can update speaking requests"
ON public.speaking_requests
FOR UPDATE
TO authenticated
USING (true);

-- Only authenticated users can delete requests
CREATE POLICY "Authenticated users can delete speaking requests"
ON public.speaking_requests
FOR DELETE
TO authenticated
USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_speaking_requests_updated_at
BEFORE UPDATE ON public.speaking_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
