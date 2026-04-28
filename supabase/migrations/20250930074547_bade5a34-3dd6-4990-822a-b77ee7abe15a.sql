-- Fix: Restrict profiles table access to prevent email exposure
-- Drop the insecure "Users can view all profiles" policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a secure policy: users can only view their own full profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a public_profiles view that exposes only non-sensitive data
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  user_id,
  username,
  display_name,
  avatar_url,
  level,
  charms,
  charms_total,
  created_at,
  last_active_at
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;

-- Enable RLS on the view (optional, but good practice)
ALTER VIEW public.public_profiles SET (security_invoker = on);

-- Add a comment to document the security fix
COMMENT ON VIEW public.public_profiles IS 'Public view of user profiles that excludes sensitive data like email addresses. Use this view for displaying user information in rankings, room members, DMs, etc.';