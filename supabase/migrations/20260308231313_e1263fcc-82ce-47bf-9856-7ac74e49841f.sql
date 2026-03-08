
-- Media folders for workspace image organization
CREATE TABLE public.media_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own folders" ON public.media_folders
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM organization_members WHERE organization_members.org_id = media_folders.org_id AND organization_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can insert folders" ON public.media_folders
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM organization_members WHERE organization_members.org_id = media_folders.org_id AND organization_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can update folders" ON public.media_folders
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM organization_members WHERE organization_members.org_id = media_folders.org_id AND organization_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete folders" ON public.media_folders
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM organization_members WHERE organization_members.org_id = media_folders.org_id AND organization_members.user_id = auth.uid()
  ));

-- Media images
CREATE TABLE public.media_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.media_folders(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL DEFAULT '',
  file_type TEXT NOT NULL DEFAULT '',
  file_size BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.media_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own images" ON public.media_images
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM organization_members WHERE organization_members.org_id = media_images.org_id AND organization_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can insert images" ON public.media_images
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM organization_members WHERE organization_members.org_id = media_images.org_id AND organization_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can update images" ON public.media_images
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM organization_members WHERE organization_members.org_id = media_images.org_id AND organization_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete images" ON public.media_images
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM organization_members WHERE organization_members.org_id = media_images.org_id AND organization_members.user_id = auth.uid()
  ));

-- Media videos (direct uploads, not YouTube)
CREATE TABLE public.media_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL DEFAULT '',
  file_type TEXT NOT NULL DEFAULT '',
  file_size BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.media_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own videos" ON public.media_videos
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM organization_members WHERE organization_members.org_id = media_videos.org_id AND organization_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can insert videos" ON public.media_videos
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM organization_members WHERE organization_members.org_id = media_videos.org_id AND organization_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can update videos" ON public.media_videos
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM organization_members WHERE organization_members.org_id = media_videos.org_id AND organization_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete videos" ON public.media_videos
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM organization_members WHERE organization_members.org_id = media_videos.org_id AND organization_members.user_id = auth.uid()
  ));

-- Storage bucket for workspace media
INSERT INTO storage.buckets (id, name, public) VALUES ('workspace-media', 'workspace-media', true);

-- Storage policies for workspace-media bucket
CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'workspace-media');

CREATE POLICY "Anyone can view media" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'workspace-media');

CREATE POLICY "Authenticated users can delete own media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'workspace-media');
