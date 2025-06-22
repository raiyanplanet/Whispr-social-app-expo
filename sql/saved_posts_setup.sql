-- Create saved_posts table for post saving functionality
CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Enable Row Level Security
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own saved posts
CREATE POLICY "Users can view their own saved posts" ON saved_posts
FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to save posts
CREATE POLICY "Users can save posts" ON saved_posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to unsave posts
CREATE POLICY "Users can unsave posts" ON saved_posts
FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX idx_saved_posts_post_id ON saved_posts(post_id);
CREATE INDEX idx_saved_posts_created_at ON saved_posts(created_at);

-- Function to handle user deletion cleanup
CREATE OR REPLACE FUNCTION handle_user_deletion_saved_posts()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all saved posts where the deleted user was the saver
  DELETE FROM saved_posts 
  WHERE user_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to clean up saved posts when user is deleted
DROP TRIGGER IF EXISTS on_user_deletion_saved_posts ON auth.users;
CREATE TRIGGER on_user_deletion_saved_posts
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_deletion_saved_posts(); 