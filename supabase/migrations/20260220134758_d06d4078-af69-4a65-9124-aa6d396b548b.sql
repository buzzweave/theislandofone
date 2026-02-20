
-- Create ai_dev_deployments table
CREATE TABLE public.ai_dev_deployments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL,
  environment text NOT NULL,
  version_tag text NOT NULL,
  status text NOT NULL,
  kind text NOT NULL DEFAULT 'push',
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_dev_deployments ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT
CREATE POLICY "Admins can select ai_dev_deployments"
  ON public.ai_dev_deployments FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin-only INSERT
CREATE POLICY "Admins can insert ai_dev_deployments"
  ON public.ai_dev_deployments FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin-only DELETE
CREATE POLICY "Admins can delete ai_dev_deployments"
  ON public.ai_dev_deployments FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No UPDATE policy: edge function uses service-role client for status transitions
