-- Create a security definer function to get user conversations
CREATE OR REPLACE FUNCTION public.get_user_conversations(target_user_id uuid)
RETURNS TABLE(conversation_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT p.conversation_id
  FROM participants p
  WHERE p.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Replace the problematic policy with one using the function
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON participants;

CREATE POLICY "Users can view participants in their conversations" 
ON participants 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  conversation_id IN (SELECT conversation_id FROM public.get_user_conversations(auth.uid()))
);