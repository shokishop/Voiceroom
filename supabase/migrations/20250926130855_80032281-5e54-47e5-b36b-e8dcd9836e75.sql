-- Fix security warnings by setting search_path on functions

-- Update generate_room_code function
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS text 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    -- Generate 6-digit code
    code := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.rooms WHERE rooms.code = code) INTO exists_check;
    
    -- Exit loop if code is unique
    IF NOT exists_check THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Update update_room_member_count function
CREATE OR REPLACE FUNCTION public.update_room_member_count()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    UPDATE public.rooms 
    SET active_members = active_members + 1,
        last_activity = now()
    WHERE id = NEW.room_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = true AND NEW.is_active = false THEN
      UPDATE public.rooms 
      SET active_members = active_members - 1,
          last_activity = now()
      WHERE id = NEW.room_id;
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      UPDATE public.rooms 
      SET active_members = active_members + 1,
          last_activity = now()
      WHERE id = NEW.room_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.is_active = true THEN
    UPDATE public.rooms 
    SET active_members = active_members - 1,
        last_activity = now()
    WHERE id = OLD.room_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;