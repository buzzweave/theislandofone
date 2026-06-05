
-- Tighten free book chapter access: must be free AND have no access tiers
DROP POLICY IF EXISTS "Anyone can view free book chapters" ON public.book_chapters;
CREATE POLICY "Anyone can view free book chapters"
ON public.book_chapters
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.books
    WHERE books.id = book_chapters.book_id
      AND books.is_free = true
      AND (books.access_tiers IS NULL OR books.access_tiers = '{}'::text[])
  )
);

-- workspace-media: replace public read with authenticated-only read
DROP POLICY IF EXISTS "Anyone can view media" ON storage.objects;
CREATE POLICY "Authenticated users can view workspace media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'workspace-media');
