
-- Fix 1: Secure downloads storage bucket - restrict upload/delete to authenticated users
DROP POLICY IF EXISTS "Anyone can upload downloads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete downloads" ON storage.objects;

CREATE POLICY "Authenticated users can upload downloads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'downloads');

CREATE POLICY "Authenticated users can delete downloads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'downloads');

-- Fix 2: Allow purchasers to view paid book chapters
CREATE POLICY "Users can view purchased book chapters"
  ON public.book_chapters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.purchases
      WHERE purchases.user_id = auth.uid()
        AND purchases.item_type = 'book'
        AND purchases.item_id = book_chapters.book_id::text
    )
  );

-- Fix 3: Allow subscribers to view book chapters based on membership
-- Create a helper function to check if user has tier access to a book
CREATE OR REPLACE FUNCTION public.user_has_book_access(
  _user_id uuid,
  _book_access_tiers text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- If no tiers specified, any active member gets access
    WHEN _book_access_tiers = '{}'::text[] OR _book_access_tiers IS NULL THEN
      EXISTS (
        SELECT 1 FROM public.members
        WHERE (members.user_id = _user_id OR members.email = (
          SELECT email FROM public.profiles WHERE id = _user_id
        ))
        AND members.status = 'active'
      )
    ELSE
      -- Check tier hierarchy: inner-circle > pastor > reader
      EXISTS (
        SELECT 1 FROM public.members
        WHERE (members.user_id = _user_id OR members.email = (
          SELECT email FROM public.profiles WHERE id = _user_id
        ))
        AND members.status = 'active'
        AND (
          -- Direct tier match
          members.plan = ANY(_book_access_tiers)
          -- Tier hierarchy: higher tiers get access to lower tier content
          OR (members.plan = 'Inner Circle')
          OR (members.plan = 'Pastor' AND 'reader' = ANY(_book_access_tiers))
        )
      )
  END
$$;

CREATE POLICY "Subscribers can view tier-appropriate chapters"
  ON public.book_chapters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_chapters.book_id
        AND public.user_has_book_access(auth.uid(), books.access_tiers)
    )
  );
