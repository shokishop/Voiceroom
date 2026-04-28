-- Fix infinite recursion in room_members RLS policy
-- Create a security definer function to check room membership
CREATE OR REPLACE FUNCTION public.is_room_member(room_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_members
    WHERE room_id = room_id_param
      AND user_id = user_id_param
      AND is_active = true
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view all room members for rooms they belong to" ON public.room_members;

-- Create new policy using the security definer function
CREATE POLICY "Users can view room members for their rooms"
ON public.room_members
FOR SELECT
USING (public.is_room_member(room_id, auth.uid()));