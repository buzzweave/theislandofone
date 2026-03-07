
-- Organizations (workspaces/tenants)
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own org" ON public.organizations FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Owners can update own org" ON public.organizations FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Authenticated can insert org" ON public.organizations FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Organization members
CREATE TABLE public.organization_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own memberships" ON public.organization_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owners can insert members" ON public.organization_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Workspace branding
CREATE TABLE public.workspace_branding (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  studio_name text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '',
  color_theme text NOT NULL DEFAULT 'default',
  author_name text NOT NULL DEFAULT '',
  publisher_name text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view branding" ON public.workspace_branding FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_branding.org_id AND user_id = auth.uid()));
CREATE POLICY "Members can update branding" ON public.workspace_branding FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_branding.org_id AND user_id = auth.uid()));
CREATE POLICY "Members can insert branding" ON public.workspace_branding FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_branding.org_id AND user_id = auth.uid()));

-- Workspace book projects
CREATE TABLE public.workspace_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view projects" ON public.workspace_projects FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_projects.org_id AND user_id = auth.uid()));
CREATE POLICY "Members can insert projects" ON public.workspace_projects FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_projects.org_id AND user_id = auth.uid()));
CREATE POLICY "Members can update projects" ON public.workspace_projects FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_projects.org_id AND user_id = auth.uid()));
CREATE POLICY "Members can delete projects" ON public.workspace_projects FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_projects.org_id AND user_id = auth.uid()));

-- Workspace chapters
CREATE TABLE public.workspace_chapters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.workspace_projects(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view chapters" ON public.workspace_chapters FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_chapters.org_id AND user_id = auth.uid()));
CREATE POLICY "Members can insert chapters" ON public.workspace_chapters FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_chapters.org_id AND user_id = auth.uid()));
CREATE POLICY "Members can update chapters" ON public.workspace_chapters FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_chapters.org_id AND user_id = auth.uid()));
CREATE POLICY "Members can delete chapters" ON public.workspace_chapters FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_chapters.org_id AND user_id = auth.uid()));

-- Workspace notes (research library)
CREATE TABLE public.workspace_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view notes" ON public.workspace_notes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_notes.org_id AND user_id = auth.uid()));
CREATE POLICY "Members can insert notes" ON public.workspace_notes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_notes.org_id AND user_id = auth.uid()));
CREATE POLICY "Members can update notes" ON public.workspace_notes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_notes.org_id AND user_id = auth.uid()));
CREATE POLICY "Members can delete notes" ON public.workspace_notes FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_notes.org_id AND user_id = auth.uid()));

-- Workspace teaching & training materials
CREATE TABLE public.workspace_materials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'teaching',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view materials" ON public.workspace_materials FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_materials.org_id AND user_id = auth.uid()));
CREATE POLICY "Members can insert materials" ON public.workspace_materials FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_materials.org_id AND user_id = auth.uid()));
CREATE POLICY "Members can update materials" ON public.workspace_materials FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_materials.org_id AND user_id = auth.uid()));
CREATE POLICY "Members can delete materials" ON public.workspace_materials FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = workspace_materials.org_id AND user_id = auth.uid()));

-- Workspace subscriptions tracking
CREATE TABLE public.workspace_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sub" ON public.workspace_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own sub" ON public.workspace_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sub" ON public.workspace_subscriptions FOR UPDATE USING (user_id = auth.uid());
