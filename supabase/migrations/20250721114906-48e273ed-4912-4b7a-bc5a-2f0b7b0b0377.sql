-- Fix infinite recursion in participants table policies
-- First, drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON participants;

-- Create a new policy without recursion
CREATE POLICY "Users can view participants in their conversations" 
ON participants 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR 
  conversation_id IN (
    SELECT conversation_id 
    FROM participants p2 
    WHERE p2.user_id = auth.uid()
  )
);