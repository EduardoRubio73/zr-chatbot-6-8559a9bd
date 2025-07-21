-- Fix conversations RLS policy to allow users to create conversations
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

CREATE POLICY "Users can create conversations" 
ON conversations 
FOR INSERT 
WITH CHECK (true);