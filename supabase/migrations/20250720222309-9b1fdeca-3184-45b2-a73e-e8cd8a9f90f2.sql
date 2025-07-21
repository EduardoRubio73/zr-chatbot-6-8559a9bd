
-- Remove all existing overly permissive RLS policies
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
DROP POLICY IF EXISTS "Allow anonymous read on users" ON users;
DROP POLICY IF EXISTS "Allow all operations on conversations" ON conversations;
DROP POLICY IF EXISTS "Allow anonymous read on conversations" ON conversations;
DROP POLICY IF EXISTS "Allow all operations on groups" ON groups;
DROP POLICY IF EXISTS "Allow anonymous read on groups" ON groups;
DROP POLICY IF EXISTS "Allow all operations on participants" ON participants;
DROP POLICY IF EXISTS "Allow anonymous read on participants" ON participants;
DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;
DROP POLICY IF EXISTS "Allow anonymous read on messages" ON messages;
DROP POLICY IF EXISTS "Allow all operations on message_reads" ON message_reads;
DROP POLICY IF EXISTS "Allow anonymous read on message_reads" ON message_reads;

-- Secure database functions by adding search_path protection
CREATE OR REPLACE FUNCTION public.email()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  select nullif(current_setting('request.jwt.claim.email', true), '')::text;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.mark_user_offline(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users 
  SET is_online = false, last_seen = now()
  WHERE id = user_id AND id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_last_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, is_online, last_seen)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 
    NEW.email, 
    true, 
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    is_online = true,
    last_seen = now();
  
  RETURN NEW;
END;
$$;

-- Create proper RLS policies for users table
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can view basic info of other users" ON users
  FOR SELECT 
  TO authenticated
  USING (auth.uid() != id);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id);

-- Create proper RLS policies for conversations table
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT 
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id 
      FROM participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Create proper RLS policies for participants table
CREATE POLICY "Users can view participants in their conversations" ON participants
  FOR SELECT 
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    conversation_id IN (
      SELECT conversation_id 
      FROM participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join conversations" ON participants
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their participation" ON participants
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid());

-- Create proper RLS policies for messages table
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT 
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations" ON messages
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id 
      FROM participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE 
  TO authenticated
  USING (sender_id = auth.uid());

-- Create proper RLS policies for groups table
CREATE POLICY "Users can view groups they participate in" ON groups
  FOR SELECT 
  TO authenticated
  USING (
    id IN (
      SELECT c.group_id 
      FROM conversations c
      JOIN participants p ON c.id = p.conversation_id
      WHERE p.user_id = auth.uid() AND c.is_group = true
    )
  );

CREATE POLICY "Users can create groups" ON groups
  FOR INSERT 
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Create proper RLS policies for message_reads table
CREATE POLICY "Users can view read status in their conversations" ON message_reads
  FOR SELECT 
  TO authenticated
  USING (
    user_id = auth.uid() OR
    message_id IN (
      SELECT m.id 
      FROM messages m
      JOIN participants p ON m.conversation_id = p.conversation_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark messages as read" ON message_reads
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Remove overly permissive storage policies
DROP POLICY IF EXISTS "Allow all storage operations" ON storage.objects;

-- Create proper storage policies
CREATE POLICY "Users can view public chat media" ON storage.objects
  FOR SELECT 
  USING (bucket_id IN ('chat-imagens', 'chat-audios', 'chat-videos', 'chat-sound', 'avatar'));

CREATE POLICY "Authenticated users can upload chat media" ON storage.objects
  FOR INSERT 
  TO authenticated
  WITH CHECK (bucket_id IN ('chat-imagens', 'chat-audios', 'chat-videos', 'avatar'));

CREATE POLICY "Users can update their own uploads" ON storage.objects
  FOR UPDATE 
  TO authenticated
  USING (bucket_id IN ('chat-imagens', 'chat-audios', 'chat-videos', 'avatar'));

CREATE POLICY "Users can delete their own uploads" ON storage.objects
  FOR DELETE 
  TO authenticated
  USING (bucket_id IN ('chat-imagens', 'chat-audios', 'chat-videos', 'avatar'));
