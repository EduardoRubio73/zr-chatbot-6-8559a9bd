
-- Fix the infinite recursion in the participants table RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.participants;

-- Create a new policy that doesn't reference itself
CREATE POLICY "Users can view participants in their conversations" 
  ON public.participants 
  FOR SELECT 
  USING (
    user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM public.participants p2 
      WHERE p2.conversation_id = participants.conversation_id 
      AND p2.user_id = auth.uid()
    )
  );

-- Also fix the conversations policy to avoid similar issues
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations" 
  ON public.conversations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.participants p 
      WHERE p.conversation_id = conversations.id 
      AND p.user_id = auth.uid()
    )
  );
