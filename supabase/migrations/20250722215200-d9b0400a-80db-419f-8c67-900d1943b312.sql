-- Add status column to conversations table for archive functionality
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS status boolean NOT NULL DEFAULT true;

-- Update existing conversations to have status = true (active)
UPDATE public.conversations 
SET status = true 
WHERE status IS NULL;

-- Add index for better performance when filtering by status
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);