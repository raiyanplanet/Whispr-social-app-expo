-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Enable Row Level Security
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see who follows whom
CREATE POLICY "Users can view follows" ON follows
FOR SELECT USING (true);

-- Policy to allow users to follow others
CREATE POLICY "Users can follow others" ON follows
FOR INSERT WITH CHECK (
  auth.uid()::text = follower_id::text AND 
  follower_id::text != following_id::text
);

-- Policy to allow users to unfollow others
CREATE POLICY "Users can unfollow others" ON follows
FOR DELETE USING (
  auth.uid()::text = follower_id::text
);

-- Policy to allow users to update their own follows (if needed)
CREATE POLICY "Users can update their own follows" ON follows
FOR UPDATE USING (
  auth.uid()::text = follower_id::text
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at);

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