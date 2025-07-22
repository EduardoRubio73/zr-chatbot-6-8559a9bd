-- Enable RLS on n8n_conversations table
ALTER TABLE public.n8n_conversations ENABLE ROW LEVEL SECURITY;

-- Create a policy for n8n_conversations (allowing all authenticated users access)
CREATE POLICY "Allow all for n8n_conversations" 
ON public.n8n_conversations 
FOR ALL 
TO authenticated 
USING (true);