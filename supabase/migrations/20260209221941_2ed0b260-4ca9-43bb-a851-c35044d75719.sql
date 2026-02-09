
-- Drop the broken restrictive SELECT policy
DROP POLICY "Anyone can view active graphics" ON public.graphics;

-- Create a permissive SELECT policy instead
CREATE POLICY "Anyone can view active graphics"
ON public.graphics
FOR SELECT
USING (is_active = true);
