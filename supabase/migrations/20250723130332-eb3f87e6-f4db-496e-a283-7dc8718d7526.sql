
-- Add is_archived column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Create index for better performance when filtering by is_archived
CREATE INDEX IF NOT EXISTS idx_conversations_is_archived ON public.conversations(is_archived);

-- Update existing conversations to have is_archived = false (active)
UPDATE public.conversations 
SET is_archived = false 
WHERE is_archived IS NULL;
