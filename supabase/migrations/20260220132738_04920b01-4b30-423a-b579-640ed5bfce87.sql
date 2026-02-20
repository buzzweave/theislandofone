
-- Create ai_dev_backups table
CREATE TABLE public.ai_dev_backups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'apply',
  version_tag text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_dev_backups ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT
CREATE POLICY "Admins can select ai_dev_backups"
  ON public.ai_dev_backups FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin-only INSERT
CREATE POLICY "Admins can insert ai_dev_backups"
  ON public.ai_dev_backups FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin-only DELETE (future retention)
CREATE POLICY "Admins can delete ai_dev_backups"
  ON public.ai_dev_backups FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
