
-- Create membership_plans table
CREATE TABLE public.membership_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  features TEXT[] NOT NULL DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view plans
CREATE POLICY "Anyone can view membership plans"
ON public.membership_plans
FOR SELECT
USING (true);

-- Seed with existing plans
INSERT INTO public.membership_plans (slug, name, price, features, is_featured, sort_order) VALUES
  ('reader', 'Reader', 9.99, ARRAY['Access to all books', 'Monthly devotional', 'Community forum', 'Early access to new releases'], false, 0),
  ('pastor', 'Pastor', 19.99, ARRAY['Everything in Reader', 'Full sermon library', 'Sermon notes & outlines', 'Pastor-only resources', 'Ministry support group'], false, 1),
  ('inner-circle', 'Inner Circle', 39.99, ARRAY['Everything in Pastor', 'Monthly live Q&A', 'Exclusive video content', 'Direct messaging', 'Priority speaking requests', 'Signed book editions'], true, 2);

-- Trigger for updated_at
CREATE TRIGGER update_membership_plans_updated_at
BEFORE UPDATE ON public.membership_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
