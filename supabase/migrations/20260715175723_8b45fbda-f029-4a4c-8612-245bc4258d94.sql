
CREATE TABLE public.saved_experiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_id UUID NOT NULL REFERENCES public.immersive_experiences(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, experience_id)
);

CREATE INDEX idx_saved_experiences_user ON public.saved_experiences(user_id);
CREATE INDEX idx_saved_experiences_exp ON public.saved_experiences(experience_id);

GRANT SELECT, INSERT, DELETE ON public.saved_experiences TO authenticated;
GRANT ALL ON public.saved_experiences TO service_role;

ALTER TABLE public.saved_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own saves"
  ON public.saved_experiences FOR SELECT
  USING (auth.uid() = user_id OR public.is_experience_editor(auth.uid()));

CREATE POLICY "Users add own saves"
  ON public.saved_experiences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own saves"
  ON public.saved_experiences FOR DELETE
  USING (auth.uid() = user_id);
