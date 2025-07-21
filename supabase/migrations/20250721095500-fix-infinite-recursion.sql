
-- Remove todas as políticas RLS existentes que estão causando recursão
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view basic info of other users" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON participants;
DROP POLICY IF EXISTS "Users can join conversations" ON participants;
DROP POLICY IF EXISTS "Users can update their participation" ON participants;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

DROP POLICY IF EXISTS "Users can view groups they participate in" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;

DROP POLICY IF EXISTS "Users can view read status in their conversations" ON message_reads;
DROP POLICY IF EXISTS "Users can mark messages as read" ON message_reads;

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

DROP POLICY IF EXISTS "Allow all storage operations" ON storage.objects;
DROP POLICY IF EXISTS "Users can view public chat media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;

-- Remove função problemática
DROP FUNCTION IF EXISTS public.get_user_conversations(uuid);

-- Desabilitar RLS temporariamente e recriar políticas simples
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads DISABLE ROW LEVEL SECURITY;

-- Reabilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- Criar políticas extremamente simples para evitar recursão

-- Users: Acesso completo para usuários autenticados
CREATE POLICY "users_policy" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Conversations: Acesso completo para usuários autenticados
CREATE POLICY "conversations_policy" ON conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Participants: Acesso completo para usuários autenticados
CREATE POLICY "participants_policy" ON participants FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Messages: Acesso completo para usuários autenticados
CREATE POLICY "messages_policy" ON messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Groups: Acesso completo para usuários autenticados
CREATE POLICY "groups_policy" ON groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Message reads: Acesso completo para usuários autenticados
CREATE POLICY "message_reads_policy" ON message_reads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage: Políticas simples sem referências a outras tabelas
CREATE POLICY "storage_select_policy" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "storage_insert_policy" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "storage_update_policy" ON storage.objects FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "storage_delete_policy" ON storage.objects FOR DELETE USING (auth.role() = 'authenticated');
