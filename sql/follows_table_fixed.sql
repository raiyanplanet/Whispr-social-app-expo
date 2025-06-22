-- Drop existing table if it exists
DROP TABLE IF EXISTS follows CASCADE;

-- Create follows table with proper foreign key relationships
CREATE TABLE follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  
  -- Foreign key constraints
  CONSTRAINT follows_follower_id_fkey 
    FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT follows_following_id_fkey 
    FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE
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

-- Function to handle user deletion cleanup
CREATE OR REPLACE FUNCTION handle_user_deletion_follows()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all follows where the deleted user was either follower or following
  DELETE FROM follows 
  WHERE follower_id = OLD.id OR following_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to clean up follows when user is deleted
DROP TRIGGER IF EXISTS on_user_deletion_follows ON auth.users;
CREATE TRIGGER on_user_deletion_follows
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_deletion_follows(); 