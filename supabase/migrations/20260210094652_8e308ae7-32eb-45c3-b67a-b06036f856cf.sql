
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function (references user_roles table which now exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS on user_roles
CREATE POLICY "Admins can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Fix videos table
DROP POLICY IF EXISTS "Allow deleting videos" ON public.videos;
DROP POLICY IF EXISTS "Allow inserting videos" ON public.videos;
DROP POLICY IF EXISTS "Allow updating videos" ON public.videos;

CREATE POLICY "Admins can insert videos"
  ON public.videos FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update videos"
  ON public.videos FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete videos"
  ON public.videos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Fix speaking_requests
DROP POLICY IF EXISTS "Authenticated users can view speaking requests" ON public.speaking_requests;
DROP POLICY IF EXISTS "Authenticated users can update speaking requests" ON public.speaking_requests;
DROP POLICY IF EXISTS "Authenticated users can delete speaking requests" ON public.speaking_requests;

CREATE POLICY "Admins can view speaking requests"
  ON public.speaking_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update speaking requests"
  ON public.speaking_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete speaking requests"
  ON public.speaking_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
