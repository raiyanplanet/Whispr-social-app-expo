-- Drop existing table if it exists
DROP TABLE IF EXISTS follows CASCADE;

-- Create follows table
CREATE TABLE follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Enable Row Level Security
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Simple policies that should work
-- Allow all authenticated users to view follows
CREATE POLICY "Allow all users to view follows" ON follows
FOR SELECT USING (true);

-- Allow authenticated users to insert follows
CREATE POLICY "Allow authenticated users to insert follows" ON follows
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to delete their own follows
CREATE POLICY "Allow users to delete their own follows" ON follows
FOR DELETE USING (auth.uid() = follower_id);

-- Create indexes for better performance
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_follows_created_at ON follows(created_at);

-- Test the table by inserting a sample follow (optional)
-- INSERT INTO follows (follower_id, following_id) VALUES 
-- ('your-user-id-here', 'another-user-id-here'); 