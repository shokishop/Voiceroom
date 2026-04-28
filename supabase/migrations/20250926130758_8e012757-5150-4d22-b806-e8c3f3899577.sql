-- Create rooms table
CREATE TABLE public.rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  is_public boolean NOT NULL DEFAULT true,
  creator_id uuid NOT NULL,
  active_members integer NOT NULL DEFAULT 0,
  max_members integer NOT NULL DEFAULT 50,
  last_activity timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create room_members table
CREATE TABLE public.room_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- Create room_messages table
CREATE TABLE public.room_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for rooms
CREATE POLICY "Public rooms are viewable by everyone" 
ON public.rooms 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Users can view rooms they are members of" 
ON public.rooms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_members 
    WHERE room_id = rooms.id AND user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can create their own rooms" 
ON public.rooms 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Room creators can update their rooms" 
ON public.rooms 
FOR UPDATE 
USING (auth.uid() = creator_id);

-- Create policies for room_members
CREATE POLICY "Users can view all room members for rooms they belong to" 
ON public.room_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm 
    WHERE rm.room_id = room_members.room_id AND rm.user_id = auth.uid() AND rm.is_active = true
  )
);

CREATE POLICY "Users can join rooms" 
ON public.room_members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms" 
ON public.room_members 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policies for room_messages
CREATE POLICY "Users can view messages from rooms they belong to" 
ON public.room_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.room_members 
    WHERE room_id = room_messages.room_id AND user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can send messages to rooms they belong to" 
ON public.room_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.room_members 
    WHERE room_id = room_messages.room_id AND user_id = auth.uid() AND is_active = true
  )
);

-- Create indexes for performance
CREATE INDEX idx_rooms_code ON public.rooms(code);
CREATE INDEX idx_rooms_is_public ON public.rooms(is_public);
CREATE INDEX idx_rooms_last_activity ON public.rooms(last_activity);
CREATE INDEX idx_room_members_room_id ON public.room_members(room_id);
CREATE INDEX idx_room_members_user_id ON public.room_members(user_id);
CREATE INDEX idx_room_messages_room_id ON public.room_messages(room_id);
CREATE INDEX idx_room_messages_created_at ON public.room_messages(created_at);

-- Create trigger to update updated_at
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate unique room codes
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS text AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update active member count
CREATE OR REPLACE FUNCTION public.update_room_member_count()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for member count updates
CREATE TRIGGER update_room_member_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.room_members
FOR EACH ROW
EXECUTE FUNCTION public.update_room_member_count();

-- Enable realtime for all tables
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.room_members REPLICA IDENTITY FULL;
ALTER TABLE public.room_messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;