-- Corrigir políticas RLS para conversations
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

-- Política simples para criação de conversas - qualquer usuário autenticado pode criar
CREATE POLICY "Users can create conversations" 
ON conversations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Garantir que a coluna status tenha valor padrão correto
ALTER TABLE conversations 
ALTER COLUMN status SET DEFAULT true;

-- Atualizar política de visualização para ser mais permissiva
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;

CREATE POLICY "Users can view their conversations" 
ON conversations 
FOR SELECT 
TO authenticated
USING (
  id IN (
    SELECT conversation_id 
    FROM participants 
    WHERE user_id = auth.uid()
  )
);

-- Corrigir política de update para conversas
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON conversations;

CREATE POLICY "Users can update conversations they participate in" 
ON conversations 
FOR UPDATE 
TO authenticated
USING (
  id IN (
    SELECT conversation_id 
    FROM participants 
    WHERE user_id = auth.uid()
  )
);

-- Adicionar política de DELETE para conversas
DROP POLICY IF EXISTS "Users can delete conversations they participate in" ON conversations;

CREATE POLICY "Users can delete conversations they participate in" 
ON conversations 
FOR DELETE 
TO authenticated
USING (
  id IN (
    SELECT conversation_id 
    FROM participants 
    WHERE user_id = auth.uid()
  )
);

-- Corrigir políticas para participants
DROP POLICY IF EXISTS "Users can join conversations" ON participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON participants;
DROP POLICY IF EXISTS "Users can update their participation" ON participants;

-- Política simplificada para inserção de participantes
CREATE POLICY "Users can join conversations" 
ON participants 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Política para visualizar participantes
CREATE POLICY "Users can view participants in their conversations" 
ON participants 
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

-- Política para atualizar participação
CREATE POLICY "Users can update their participation" 
ON participants 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

-- Política para deletar participantes
CREATE POLICY "Users can delete participants" 
ON participants 
FOR DELETE 
TO authenticated
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM participants 
    WHERE user_id = auth.uid()
  )
);

-- Corrigir políticas para messages
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

CREATE POLICY "Users can send messages to their conversations" 
ON messages 
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

-- Política para deletar mensagens
DROP POLICY IF EXISTS "Users can delete messages" ON messages;

CREATE POLICY "Users can delete messages" 
ON messages 
FOR DELETE 
TO authenticated
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM participants 
    WHERE user_id = auth.uid()
  )
);