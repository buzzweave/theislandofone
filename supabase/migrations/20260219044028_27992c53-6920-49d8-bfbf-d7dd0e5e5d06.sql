
-- Add optional user_id column to members table
ALTER TABLE public.members ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create trigger function to auto-link members when a profile is created
CREATE OR REPLACE FUNCTION public.link_member_on_profile_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.members
  SET user_id = NEW.id
  WHERE email = NEW.email AND user_id IS NULL;
  RETURN NEW;
END;
$$;

-- Create the trigger on profiles table
CREATE TRIGGER on_profile_created_link_member
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.link_member_on_profile_create();
