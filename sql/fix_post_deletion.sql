-- Fix RLS policies for post deletion
-- This script ensures that users can delete their own posts

-- Drop existing RLS policies on posts table
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can view posts from friends" ON posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON posts;

-- Create new RLS policies for posts table
CREATE POLICY "Users can insert their own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view posts from friends" ON posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM friend_requests 
      WHERE status = 'accepted' 
      AND (
        (sender_id = auth.uid() AND receiver_id = posts.user_id) OR
        (sender_id = posts.user_id AND receiver_id = auth.uid())
      )
    ) OR posts.user_id = auth.uid()
  );

CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- Drop existing RLS policies on likes table
DROP POLICY IF EXISTS "Users can manage their own likes" ON likes;
DROP POLICY IF EXISTS "Users can view likes" ON likes;

-- Create new RLS policies for likes table
CREATE POLICY "Users can insert their own likes" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view likes" ON likes
  FOR SELECT USING (true);

CREATE POLICY "Users can delete their own likes" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- Drop existing RLS policies on comments table
DROP POLICY IF EXISTS "Users can manage their own comments" ON comments;
DROP POLICY IF EXISTS "Users can view comments" ON comments;

-- Create new RLS policies for comments table
CREATE POLICY "Users can insert their own comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view comments" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Ensure CASCADE deletion is set up properly
-- This will automatically delete likes and comments when a post is deleted
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_post_id_fkey;
ALTER TABLE likes ADD CONSTRAINT likes_post_id_fkey 
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_post_id_fkey;
ALTER TABLE comments ADD CONSTRAINT comments_post_id_fkey 
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- Enable RLS on all tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Test the deletion by creating a simple function
CREATE OR REPLACE FUNCTION test_post_deletion(post_id UUID)
RETURNS TEXT AS $$
DECLARE
  current_user_id UUID;
  post_exists BOOLEAN;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN 'User not authenticated';
  END IF;
  
  -- Check if post exists and belongs to user
  SELECT EXISTS(
    SELECT 1 FROM posts 
    WHERE id = post_id AND user_id = current_user_id
  ) INTO post_exists;
  
  IF NOT post_exists THEN
    RETURN 'Post not found or user does not own it';
  END IF;
  
  -- Delete the post (this will cascade to likes and comments)
  DELETE FROM posts WHERE id = post_id AND user_id = current_user_id;
  
  -- Verify deletion
  SELECT EXISTS(SELECT 1 FROM posts WHERE id = post_id) INTO post_exists;
  
  IF post_exists THEN
    RETURN 'Post still exists after deletion';
  ELSE
    RETURN 'Post successfully deleted';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 