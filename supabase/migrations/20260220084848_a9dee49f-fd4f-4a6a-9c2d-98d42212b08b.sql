
-- Remove the overly permissive INSERT policy on notifications
-- The send-notification edge function uses service role which bypasses RLS
DROP POLICY IF EXISTS "Anyone can insert notifications via function" ON public.notifications;

-- Remove overly permissive SELECT/UPDATE/DELETE policies and restrict to admins
DROP POLICY IF EXISTS "Allow read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow delete notifications" ON public.notifications;

-- Add admin-only policies for SELECT, UPDATE, DELETE
CREATE POLICY "Admins can view notifications"
  ON public.notifications FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update notifications"
  ON public.notifications FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete notifications"
  ON public.notifications FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
