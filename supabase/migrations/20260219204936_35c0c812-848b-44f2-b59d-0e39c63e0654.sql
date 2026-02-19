
-- Admin can view ALL graphics (active + drafts)
CREATE POLICY "Admins can view all graphics"
ON public.graphics FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view ALL videos (active + drafts)
CREATE POLICY "Admins can view all videos"
ON public.videos FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
