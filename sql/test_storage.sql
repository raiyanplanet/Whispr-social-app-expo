-- Test script to verify Supabase storage setup
-- Run this in your Supabase SQL editor to check if everything is set up correctly

-- Check if the avatars bucket exists
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Check storage policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';

-- Check if RLS is enabled on storage.objects
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- Test if current user can access storage
SELECT auth.uid() as current_user_id;

-- Check if the user has the necessary permissions
SELECT 
  bucket_id,
  name,
  owner
FROM storage.objects 
WHERE bucket_id = 'avatars' 
LIMIT 1; 