
-- GOAL 1: Books publish toggle
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS unpublished_at timestamp with time zone;

-- Set all existing books as published (backward compat)
UPDATE public.books SET is_published = true, published_at = created_at WHERE is_published = false;

-- GOAL 2: AI Chat tables
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New Chat',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai_conversations" ON public.ai_conversations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai_messages" ON public.ai_messages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- GOAL 4: Video URL on blog posts
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS video_url text NOT NULL DEFAULT '';

-- GOAL 5: SMS fields on subscribers
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS phone_number text DEFAULT '';
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS sms_opt_in boolean DEFAULT false;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS sms_opt_out boolean DEFAULT false;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS sms_last_opt_in_at timestamp with time zone;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS sms_last_opt_out_at timestamp with time zone;

-- SMS Campaigns table
CREATE TABLE public.sms_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  message_template text NOT NULL DEFAULT '',
  created_by uuid,
  status text NOT NULL DEFAULT 'draft',
  scheduled_for timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sms_campaigns" ON public.sms_campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- SMS Messages table
CREATE TABLE public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.sms_campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.subscribers(id) ON DELETE SET NULL,
  to_number text NOT NULL DEFAULT '',
  from_number text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  provider_message_id text DEFAULT '',
  error text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone
);

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sms_messages" ON public.sms_messages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for blog videos
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-videos', 'blog-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view blog videos" ON storage.objects FOR SELECT USING (bucket_id = 'blog-videos');
CREATE POLICY "Admins can upload blog videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'blog-videos' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete blog videos" ON storage.objects FOR DELETE USING (bucket_id = 'blog-videos' AND has_role(auth.uid(), 'admin'::app_role));
