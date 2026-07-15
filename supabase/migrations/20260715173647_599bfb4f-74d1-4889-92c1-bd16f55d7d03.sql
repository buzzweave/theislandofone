
-- Helpers
CREATE OR REPLACE FUNCTION public.is_experience_editor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin'::public.app_role) OR public.has_role(_user_id, 'content_editor'::public.app_role) $$;

CREATE OR REPLACE FUNCTION public.is_prayer_team(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin'::public.app_role) OR public.has_role(_user_id, 'prayer_team'::public.app_role) $$;

-- experience_series
CREATE TABLE public.experience_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  artwork_url text,
  trailer_url text,
  order_index integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.experience_series TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_series TO authenticated;
GRANT ALL ON public.experience_series TO service_role;
ALTER TABLE public.experience_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published series" ON public.experience_series FOR SELECT USING (status = 'published' OR public.is_experience_editor(auth.uid()));
CREATE POLICY "Editors manage series" ON public.experience_series FOR ALL USING (public.is_experience_editor(auth.uid())) WITH CHECK (public.is_experience_editor(auth.uid()));

-- immersive_experiences
CREATE TABLE public.immersive_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES public.experience_series(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text,
  long_description text,
  primary_scripture text,
  supporting_scriptures jsonb NOT NULL DEFAULT '[]'::jsonb,
  speaker text,
  release_date date,
  premiere_at timestamptz,
  runtime_seconds integer,
  category text,
  audience text,
  featured_image text,
  mobile_image text,
  cinematic_bg text,
  poster_url text,
  trailer_url text,
  video_provider text,
  video_playback_id text,
  video_url text,
  captions_url text,
  transcript text,
  ambient_audio_url text,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  social_image text,
  visibility text NOT NULL DEFAULT 'public',
  status text NOT NULL DEFAULT 'draft',
  members_only boolean NOT NULL DEFAULT false,
  allow_download boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_immersive_experiences_series ON public.immersive_experiences(series_id);
CREATE INDEX idx_immersive_experiences_status ON public.immersive_experiences(status);
GRANT SELECT ON public.immersive_experiences TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.immersive_experiences TO authenticated;
GRANT ALL ON public.immersive_experiences TO service_role;
ALTER TABLE public.immersive_experiences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_has_experience_access(_user_id uuid, _experience_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.immersive_experiences e
    WHERE e.id = _experience_id AND (
      public.is_experience_editor(_user_id)
      OR (e.status = 'published' AND e.visibility IN ('public','scheduled') AND (
        e.members_only = false
        OR EXISTS (
          SELECT 1 FROM public.members m
          WHERE (m.user_id = _user_id OR m.email = (SELECT email FROM public.profiles WHERE id = _user_id))
            AND m.status = 'active'
        )
      ))
    )
  )
$$;

CREATE POLICY "Public read published experiences" ON public.immersive_experiences FOR SELECT USING (
  public.is_experience_editor(auth.uid())
  OR (status = 'published' AND visibility IN ('public','scheduled') AND (members_only = false OR public.user_has_experience_access(auth.uid(), id)))
);
CREATE POLICY "Editors manage experiences" ON public.immersive_experiences FOR ALL USING (public.is_experience_editor(auth.uid())) WITH CHECK (public.is_experience_editor(auth.uid()));

-- experience_scenes
CREATE TABLE public.experience_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.immersive_experiences(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  scene_type text NOT NULL DEFAULT 'content',
  title text,
  internal_label text,
  start_ts numeric,
  end_ts numeric,
  background_url text,
  background_kind text,
  ambient_audio_url text,
  heading text,
  body text,
  scripture text,
  scripture_ref text,
  quote text,
  animation text,
  transition text,
  overlay_opacity numeric DEFAULT 0.4,
  text_align text DEFAULT 'center',
  cta jsonb NOT NULL DEFAULT '{}'::jsonb,
  mobile jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_experience_scenes_experience ON public.experience_scenes(experience_id, order_index);
GRANT SELECT ON public.experience_scenes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_scenes TO authenticated;
GRANT ALL ON public.experience_scenes TO service_role;
ALTER TABLE public.experience_scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read scenes if experience visible" ON public.experience_scenes FOR SELECT USING (
  public.is_experience_editor(auth.uid())
  OR EXISTS (SELECT 1 FROM public.immersive_experiences e WHERE e.id = experience_id AND e.status = 'published' AND e.visibility IN ('public','scheduled'))
);
CREATE POLICY "Editors manage scenes" ON public.experience_scenes FOR ALL USING (public.is_experience_editor(auth.uid())) WITH CHECK (public.is_experience_editor(auth.uid()));

-- experience_interactions
CREATE TABLE public.experience_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.immersive_experiences(id) ON DELETE CASCADE,
  scene_id uuid REFERENCES public.experience_scenes(id) ON DELETE SET NULL,
  kind text NOT NULL,
  name text,
  heading text,
  body text,
  appear_ts numeric,
  expire_ts numeric,
  duration_ms integer,
  required boolean NOT NULL DEFAULT false,
  button_label text,
  destination text,
  confirmation text,
  follow_up jsonb NOT NULL DEFAULT '{}'::jsonb,
  audience text,
  mobile jsonb NOT NULL DEFAULT '{}'::jsonb,
  anonymous_allowed boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_experience_interactions_experience ON public.experience_interactions(experience_id);
GRANT SELECT ON public.experience_interactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_interactions TO authenticated;
GRANT ALL ON public.experience_interactions TO service_role;
ALTER TABLE public.experience_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read interactions if experience visible" ON public.experience_interactions FOR SELECT USING (
  public.is_experience_editor(auth.uid())
  OR EXISTS (SELECT 1 FROM public.immersive_experiences e WHERE e.id = experience_id AND e.status = 'published' AND e.visibility IN ('public','scheduled'))
);
CREATE POLICY "Editors manage interactions" ON public.experience_interactions FOR ALL USING (public.is_experience_editor(auth.uid())) WITH CHECK (public.is_experience_editor(auth.uid()));

-- experience_media
CREATE TABLE public.experience_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid REFERENCES public.immersive_experiences(id) ON DELETE CASCADE,
  kind text NOT NULL,
  url text NOT NULL,
  storage_path text,
  mime text,
  width integer,
  height integer,
  duration numeric,
  tags text[] NOT NULL DEFAULT '{}',
  title text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_experience_media_experience ON public.experience_media(experience_id);
GRANT SELECT ON public.experience_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_media TO authenticated;
GRANT ALL ON public.experience_media TO service_role;
ALTER TABLE public.experience_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read media if experience visible" ON public.experience_media FOR SELECT USING (
  public.is_experience_editor(auth.uid())
  OR (experience_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.immersive_experiences e WHERE e.id = experience_id AND e.status = 'published' AND e.visibility IN ('public','scheduled')))
);
CREATE POLICY "Editors manage media" ON public.experience_media FOR ALL USING (public.is_experience_editor(auth.uid())) WITH CHECK (public.is_experience_editor(auth.uid()));

-- experience_view_progress
CREATE TABLE public.experience_view_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.immersive_experiences(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  anon_id text,
  position_seconds numeric NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT progress_owner_ck CHECK (user_id IS NOT NULL OR anon_id IS NOT NULL)
);
CREATE UNIQUE INDEX ux_progress_user ON public.experience_view_progress(experience_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX ux_progress_anon ON public.experience_view_progress(experience_id, anon_id) WHERE anon_id IS NOT NULL AND user_id IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_view_progress TO authenticated;
GRANT INSERT, UPDATE, SELECT ON public.experience_view_progress TO anon;
GRANT ALL ON public.experience_view_progress TO service_role;
ALTER TABLE public.experience_view_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own progress" ON public.experience_view_progress FOR SELECT USING (auth.uid() = user_id OR public.is_experience_editor(auth.uid()));
CREATE POLICY "Users insert own progress" ON public.experience_view_progress FOR INSERT WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR (auth.uid() IS NULL AND user_id IS NULL AND anon_id IS NOT NULL)
);
CREATE POLICY "Users update own progress" ON public.experience_view_progress FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR (auth.uid() IS NULL AND user_id IS NULL AND anon_id IS NOT NULL)
);

-- experience_events
CREATE TABLE public.experience_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.immersive_experiences(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anon_id text,
  kind text NOT NULL,
  ts timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_events_experience_ts ON public.experience_events(experience_id, ts);
GRANT INSERT ON public.experience_events TO anon, authenticated;
GRANT SELECT ON public.experience_events TO authenticated;
GRANT ALL ON public.experience_events TO service_role;
ALTER TABLE public.experience_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone logs events" ON public.experience_events FOR INSERT WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL) OR (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
);
CREATE POLICY "Editors read events" ON public.experience_events FOR SELECT USING (public.is_experience_editor(auth.uid()));

-- experience_responses
CREATE TABLE public.experience_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.immersive_experiences(id) ON DELETE CASCADE,
  interaction_id uuid REFERENCES public.experience_interactions(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anon_id text,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_private boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_responses_experience ON public.experience_responses(experience_id);
GRANT INSERT ON public.experience_responses TO anon, authenticated;
GRANT SELECT ON public.experience_responses TO authenticated;
GRANT ALL ON public.experience_responses TO service_role;
ALTER TABLE public.experience_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Submit responses" ON public.experience_responses FOR INSERT WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL) OR (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
);
CREATE POLICY "Read own responses" ON public.experience_responses FOR SELECT USING (
  public.is_experience_editor(auth.uid()) OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- prayer_requests
CREATE TABLE public.prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid REFERENCES public.immersive_experiences(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anon_id text,
  name text,
  contact text,
  message text NOT NULL,
  urgency text DEFAULT 'normal',
  status text NOT NULL DEFAULT 'new',
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  private_notes text,
  visibility text NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prayer_status ON public.prayer_requests(status);
GRANT INSERT ON public.prayer_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.prayer_requests TO authenticated;
GRANT ALL ON public.prayer_requests TO service_role;
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Submit prayer" ON public.prayer_requests FOR INSERT WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL) OR (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
);
CREATE POLICY "Prayer team reads" ON public.prayer_requests FOR SELECT USING (public.is_prayer_team(auth.uid()));
CREATE POLICY "Prayer team updates" ON public.prayer_requests FOR UPDATE USING (public.is_prayer_team(auth.uid())) WITH CHECK (public.is_prayer_team(auth.uid()));
CREATE POLICY "Admin deletes prayer" ON public.prayer_requests FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- prayer_assignments
CREATE TABLE public.prayer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'assigned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_assignments TO authenticated;
GRANT ALL ON public.prayer_assignments TO service_role;
ALTER TABLE public.prayer_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prayer team reads assignments" ON public.prayer_assignments FOR SELECT USING (public.is_prayer_team(auth.uid()));
CREATE POLICY "Prayer team manages assignments" ON public.prayer_assignments FOR ALL USING (public.is_prayer_team(auth.uid())) WITH CHECK (public.is_prayer_team(auth.uid()));

-- experience_chat_messages
CREATE TABLE public.experience_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.immersive_experiences(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text,
  body text NOT NULL,
  is_moderated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_experience ON public.experience_chat_messages(experience_id, created_at);
GRANT SELECT ON public.experience_chat_messages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.experience_chat_messages TO authenticated;
GRANT ALL ON public.experience_chat_messages TO service_role;
ALTER TABLE public.experience_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read unmoderated chat" ON public.experience_chat_messages FOR SELECT USING (is_moderated = false OR public.is_experience_editor(auth.uid()));
CREATE POLICY "Post chat" ON public.experience_chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Edit own chat" ON public.experience_chat_messages FOR UPDATE USING (auth.uid() = user_id OR public.is_experience_editor(auth.uid())) WITH CHECK (auth.uid() = user_id OR public.is_experience_editor(auth.uid()));
CREATE POLICY "Delete own chat" ON public.experience_chat_messages FOR DELETE USING (auth.uid() = user_id OR public.is_experience_editor(auth.uid()));

-- experience_premieres
CREATE TABLE public.experience_premieres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.immersive_experiences(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  host_message text,
  viewer_count_cached integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.experience_premieres TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.experience_premieres TO authenticated;
GRANT ALL ON public.experience_premieres TO service_role;
ALTER TABLE public.experience_premieres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read premieres" ON public.experience_premieres FOR SELECT USING (true);
CREATE POLICY "Editors manage premieres" ON public.experience_premieres FOR ALL USING (public.is_experience_editor(auth.uid())) WITH CHECK (public.is_experience_editor(auth.uid()));

-- experience_team_members
CREATE TABLE public.experience_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.immersive_experiences(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(experience_id, user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experience_team_members TO authenticated;
GRANT ALL ON public.experience_team_members TO service_role;
ALTER TABLE public.experience_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read team" ON public.experience_team_members FOR SELECT USING (public.is_experience_editor(auth.uid()) OR auth.uid() = user_id);
CREATE POLICY "Admin manages team" ON public.experience_team_members FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'experience_series','immersive_experiences','experience_scenes',
    'experience_interactions','experience_media','experience_view_progress',
    'prayer_requests','prayer_assignments','experience_premieres'
  ])
  LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END $$;
