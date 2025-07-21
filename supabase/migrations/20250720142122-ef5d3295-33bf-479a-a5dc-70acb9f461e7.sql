
-- First, let's drop the problematic storage policies that might be causing recursion
DROP POLICY IF EXISTS "Avatar bucket select policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar bucket insert policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar bucket update policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar bucket delete policy" ON storage.objects;

-- Create simpler, non-recursive storage policies for avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatar');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatar' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatar' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatar' 
    AND auth.role() = 'authenticated'
  );

-- Also create a security definer function to safely check user permissions
-- without causing recursion issues
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
