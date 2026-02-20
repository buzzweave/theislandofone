
-- ai_dev_plans
CREATE TABLE public.ai_dev_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text NOT NULL,
  mode text NOT NULL DEFAULT 'fix_bugs',
  plan jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_dev_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select ai_dev_plans" ON public.ai_dev_plans FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert ai_dev_plans" ON public.ai_dev_plans FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update ai_dev_plans" ON public.ai_dev_plans FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete ai_dev_plans" ON public.ai_dev_plans FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_ai_dev_plans_updated_at BEFORE UPDATE ON public.ai_dev_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai_dev_scans
CREATE TABLE public.ai_dev_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type text NOT NULL DEFAULT 'full',
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_dev_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select ai_dev_scans" ON public.ai_dev_scans FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert ai_dev_scans" ON public.ai_dev_scans FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update ai_dev_scans" ON public.ai_dev_scans FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete ai_dev_scans" ON public.ai_dev_scans FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ai_dev_audit (immutable)
CREATE TABLE public.ai_dev_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.ai_dev_plans(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_dev_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select ai_dev_audit" ON public.ai_dev_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert ai_dev_audit" ON public.ai_dev_audit FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ai_dev_settings
CREATE TABLE public.ai_dev_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_dev_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select ai_dev_settings" ON public.ai_dev_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert ai_dev_settings" ON public.ai_dev_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update ai_dev_settings" ON public.ai_dev_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete ai_dev_settings" ON public.ai_dev_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default settings
INSERT INTO public.ai_dev_settings (key, value) VALUES
  ('ai_model', 'google/gemini-3-flash-preview'),
  ('allowed_folders', ''),
  ('forbidden_folders', '');
