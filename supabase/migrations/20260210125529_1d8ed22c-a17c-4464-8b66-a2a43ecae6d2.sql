-- Drop the overly permissive SELECT policy on book_chapters
DROP POLICY "Anyone can view chapters" ON public.book_chapters;

-- Allow public access ONLY to chapters of free books
CREATE POLICY "Anyone can view free book chapters"
ON public.book_chapters
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.books
    WHERE books.id = book_chapters.book_id
    AND books.is_free = true
  )
);

-- Admins can view ALL chapters (including paid)
CREATE POLICY "Admins can view all chapters"
ON public.book_chapters
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));