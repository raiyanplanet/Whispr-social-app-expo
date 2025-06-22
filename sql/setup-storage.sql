-- Setup storage bucket for profile pictures
-- Run this in your Supabase SQL editor

-- Create storage bucket for avatars/profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow authenticated users to upload their own profile pictures
CREATE POLICY "Users can upload their own profile pictures" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage policy to allow public read access to profile pictures
CREATE POLICY "Profile pictures are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Create storage policy to allow users to update their own profile pictures
CREATE POLICY "Users can update their own profile pictures" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage policy to allow users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile pictures" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  ); 