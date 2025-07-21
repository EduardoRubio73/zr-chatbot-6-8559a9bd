
-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

-- Remover políticas de storage se existirem
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat audios" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat audios" ON storage.objects;
DROP POLICY IF EXISTS "Users can update chat audios" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete chat audios" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update chat videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete chat videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat sounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat sounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can update chat sounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete chat sounds" ON storage.objects;

-- Políticas para tabela users
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete their own profile" ON users FOR DELETE USING (auth.uid() = id);

-- Políticas para tabela conversations
CREATE POLICY "Users can view all conversations" ON conversations FOR SELECT USING (true);
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update conversations" ON conversations FOR UPDATE USING (true);
CREATE POLICY "Users can delete conversations" ON conversations FOR DELETE USING (true);

-- Políticas para tabela groups
CREATE POLICY "Users can view all groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Users can create groups" ON groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update groups" ON groups FOR UPDATE USING (true);
CREATE POLICY "Users can delete groups" ON groups FOR DELETE USING (true);

-- Políticas para tabela participants
CREATE POLICY "Users can view all participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Users can create participants" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update participants" ON participants FOR UPDATE USING (true);
CREATE POLICY "Users can delete participants" ON participants FOR DELETE USING (true);

-- Políticas para tabela messages
CREATE POLICY "Users can view all messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Users can create messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update messages" ON messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Users can delete messages" ON messages FOR DELETE USING (auth.uid() = sender_id);

-- Políticas para tabela message_reads
CREATE POLICY "Users can view all message reads" ON message_reads FOR SELECT USING (true);
CREATE POLICY "Users can create message reads" ON message_reads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update message reads" ON message_reads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete message reads" ON message_reads FOR DELETE USING (auth.uid() = user_id);

-- Políticas corrigidas para storage (avatars) - mais permissivas para debug
CREATE POLICY "Avatar bucket select policy" ON storage.objects FOR SELECT USING (bucket_id = 'avatar');
CREATE POLICY "Avatar bucket insert policy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatar' AND auth.role() = 'authenticated');
CREATE POLICY "Avatar bucket update policy" ON storage.objects FOR UPDATE USING (bucket_id = 'avatar' AND auth.role() = 'authenticated');
CREATE POLICY "Avatar bucket delete policy" ON storage.objects FOR DELETE USING (bucket_id = 'avatar' AND auth.role() = 'authenticated');

-- Políticas para storage (chat-audios)
CREATE POLICY "Chat audios select policy" ON storage.objects FOR SELECT USING (bucket_id = 'chat-audios');
CREATE POLICY "Chat audios insert policy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-audios' AND auth.role() = 'authenticated');
CREATE POLICY "Chat audios update policy" ON storage.objects FOR UPDATE USING (bucket_id = 'chat-audios' AND auth.role() = 'authenticated');
CREATE POLICY "Chat audios delete policy" ON storage.objects FOR DELETE USING (bucket_id = 'chat-audios' AND auth.role() = 'authenticated');

-- Políticas para storage (chat-imagens)
CREATE POLICY "Chat images select policy" ON storage.objects FOR SELECT USING (bucket_id = 'chat-imagens');
CREATE POLICY "Chat images insert policy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-imagens' AND auth.role() = 'authenticated');
CREATE POLICY "Chat images update policy" ON storage.objects FOR UPDATE USING (bucket_id = 'chat-imagens' AND auth.role() = 'authenticated');
CREATE POLICY "Chat images delete policy" ON storage.objects FOR DELETE USING (bucket_id = 'chat-imagens' AND auth.role() = 'authenticated');

-- Políticas para storage (chat-videos)
CREATE POLICY "Chat videos select policy" ON storage.objects FOR SELECT USING (bucket_id = 'chat-videos');
CREATE POLICY "Chat videos insert policy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-videos' AND auth.role() = 'authenticated');
CREATE POLICY "Chat videos update policy" ON storage.objects FOR UPDATE USING (bucket_id = 'chat-videos' AND auth.role() = 'authenticated');
CREATE POLICY "Chat videos delete policy" ON storage.objects FOR DELETE USING (bucket_id = 'chat-videos' AND auth.role() = 'authenticated');

-- Políticas para storage (chat-sound)
CREATE POLICY "Chat sounds select policy" ON storage.objects FOR SELECT USING (bucket_id = 'chat-sound');
CREATE POLICY "Chat sounds insert policy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-sound' AND auth.role() = 'authenticated');
CREATE POLICY "Chat sounds update policy" ON storage.objects FOR UPDATE USING (bucket_id = 'chat-sound' AND auth.role() = 'authenticated');
CREATE POLICY "Chat sounds delete policy" ON storage.objects FOR DELETE USING (bucket_id = 'chat-sound' AND auth.role() = 'authenticated');
