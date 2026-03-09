CREATE OR REPLACE FUNCTION public.user_has_book_access(_user_id uuid, _book_access_tiers text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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
      EXISTS (
        SELECT 1 FROM public.members
        WHERE (members.user_id = _user_id OR members.email = (
          SELECT email FROM public.profiles WHERE id = _user_id
        ))
        AND members.status = 'active'
        AND (
          -- Direct tier match
          members.plan = ANY(_book_access_tiers)
          -- Inner Circle gets access to everything
          OR (members.plan = 'Inner Circle')
          -- Pastor gets access to everything (all sermons, books, graphics)
          OR (members.plan = 'Pastor')
        )
      )
  END
$$;