
-- Remover todas as políticas RLS existentes
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can delete their own profile" ON users;
DROP POLICY IF EXISTS "Users can view conversation participants" ON users;
DROP POLICY IF EXISTS "Users can view online users" ON users;

DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;
DROP POLICY IF EXISTS "Participants can delete conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

DROP POLICY IF EXISTS "Users can view groups they participate in" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;
DROP POLICY IF EXISTS "Group members can update groups" ON groups;
DROP POLICY IF EXISTS "Group creators can delete groups" ON groups;

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON participants;
DROP POLICY IF EXISTS "Users can join conversations" ON participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON participants;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

DROP POLICY IF EXISTS "Users can view read status in their conversations" ON message_reads;
DROP POLICY IF EXISTS "Users can mark messages as read" ON message_reads;
DROP POLICY IF EXISTS "Users can update their own read status" ON message_reads;
DROP POLICY IF EXISTS "Users can delete their own read status" ON message_reads;

-- Criar políticas completamente liberadas para debug
-- Tabela users - acesso total
CREATE POLICY "Allow all operations on users" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read on users" ON users FOR SELECT TO anon USING (true);

-- Tabela conversations - acesso total
CREATE POLICY "Allow all operations on conversations" ON conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read on conversations" ON conversations FOR SELECT TO anon USING (true);

-- Tabela groups - acesso total
CREATE POLICY "Allow all operations on groups" ON groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read on groups" ON groups FOR SELECT TO anon USING (true);

-- Tabela participants - acesso total
CREATE POLICY "Allow all operations on participants" ON participants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read on participants" ON participants FOR SELECT TO anon USING (true);

-- Tabela messages - acesso total
CREATE POLICY "Allow all operations on messages" ON messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read on messages" ON messages FOR SELECT TO anon USING (true);

-- Tabela message_reads - acesso total
CREATE POLICY "Allow all operations on message_reads" ON message_reads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read on message_reads" ON message_reads FOR SELECT TO anon USING (true);

-- Remover função que pode estar causando recursão
DROP FUNCTION IF EXISTS public.get_user_conversations(uuid);

-- Verificar permissões de storage
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

DROP POLICY IF EXISTS "Chat audios select policy" ON storage.objects;
DROP POLICY IF EXISTS "Chat audios insert policy" ON storage.objects;
DROP POLICY IF EXISTS "Chat audios update policy" ON storage.objects;
DROP POLICY IF EXISTS "Chat audios delete policy" ON storage.objects;

DROP POLICY IF EXISTS "Chat images select policy" ON storage.objects;
DROP POLICY IF EXISTS "Chat images insert policy" ON storage.objects;
DROP POLICY IF EXISTS "Chat images update policy" ON storage.objects;
DROP POLICY IF EXISTS "Chat images delete policy" ON storage.objects;

DROP POLICY IF EXISTS "Chat videos select policy" ON storage.objects;
DROP POLICY IF EXISTS "Chat videos insert policy" ON storage.objects;
DROP POLICY IF EXISTS "Chat videos update policy" ON storage.objects;
DROP POLICY IF EXISTS "Chat videos delete policy" ON storage.objects;

DROP POLICY IF EXISTS "Chat sounds select policy" ON storage.objects;
DROP POLICY IF EXISTS "Chat sounds insert policy" ON storage.objects;
DROP POLICY IF EXISTS "Chat sounds update policy" ON storage.objects;
DROP POLICY IF EXISTS "Chat sounds delete policy" ON storage.objects;

-- Criar políticas de storage completamente liberadas
CREATE POLICY "Allow all storage operations" ON storage.objects FOR ALL USING (true) WITH CHECK (true);
