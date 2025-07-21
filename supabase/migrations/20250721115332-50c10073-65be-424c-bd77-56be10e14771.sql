-- Remove todas as políticas problemáticas e recria sem recursão
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON participants;
DROP POLICY IF EXISTS "users_can_view_conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;

-- Cria função para verificar se usuário participa da conversa
CREATE OR REPLACE FUNCTION public.user_participates_in_conversation(conversation_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM participants 
    WHERE participants.conversation_id = user_participates_in_conversation.conversation_id 
    AND participants.user_id = user_participates_in_conversation.user_id
  );
$$;

-- Política para participants sem recursão
CREATE POLICY "Users can view participants in their conversations" 
ON participants 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR 
  public.user_participates_in_conversation(conversation_id, auth.uid())
);

-- Política para conversations sem recursão  
CREATE POLICY "Users can view their conversations" 
ON conversations 
FOR SELECT 
USING (
  public.user_participates_in_conversation(id, auth.uid())
);