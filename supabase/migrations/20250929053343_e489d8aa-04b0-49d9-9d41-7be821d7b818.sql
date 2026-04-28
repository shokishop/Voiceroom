-- Update profiles table to ensure username is unique and case-insensitive
-- Add unique constraint on username with case-insensitive collation
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Create index for case-insensitive username lookups
CREATE UNIQUE INDEX profiles_username_ci_idx ON public.profiles (LOWER(username));

-- Update profiles table to ensure email is unique
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- Add display_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_name') THEN
        ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
    END IF;
END $$;

-- Function to handle username validation during login
CREATE OR REPLACE FUNCTION public.get_user_by_username_or_email(input_text text)
RETURNS TABLE (user_id uuid, email text, username text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.email, p.username
  FROM public.profiles p
  WHERE LOWER(p.username) = LOWER(input_text) 
     OR LOWER(p.email) = LOWER(input_text);
END;
$$;