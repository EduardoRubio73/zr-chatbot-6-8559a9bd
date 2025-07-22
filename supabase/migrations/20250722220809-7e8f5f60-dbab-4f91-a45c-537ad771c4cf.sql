-- Fix RLS policy for conversations to allow creation
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

CREATE POLICY "Users can create conversations" 
ON conversations 
FOR INSERT 
WITH CHECK (true);

-- Also ensure status column exists with proper default
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS status boolean DEFAULT true;