DROP POLICY "Anyone can view books" ON public.books;

CREATE POLICY "Anyone can view published books"
ON public.books FOR SELECT
TO anon, authenticated
USING (is_published = true);

CREATE POLICY "Admins can view all books"
ON public.books FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));