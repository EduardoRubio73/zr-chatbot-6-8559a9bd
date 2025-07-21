-- Fix the infinite recursion in participants policies
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON participants;

-- Create a simpler policy that avoids recursion
CREATE POLICY "Users can view participants in their conversations" 
ON participants 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  conversation_id IN (
    SELECT conversation_id 
    FROM participants 
    WHERE user_id = auth.uid()
  )
);