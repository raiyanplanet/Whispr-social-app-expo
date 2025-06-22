-- Comprehensive database setup fix for social app
-- This file fixes RLS policies and ensures proper foreign key handling

-- 1. Fix RLS policies for posts table
DROP POLICY IF EXISTS "Users can view posts from friends" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

CREATE POLICY "Users can view posts from friends" ON posts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM friend_requests 
    WHERE status = 'accepted' 
    AND (
      (sender_id = auth.uid() AND receiver_id = posts.user_id) OR
      (receiver_id = auth.uid() AND sender_id = posts.user_id) OR
      posts.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create posts" ON posts
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can update their own posts" ON posts
FOR UPDATE USING (
  auth.uid() = user_id
);

CREATE POLICY "Users can delete their own posts" ON posts
FOR DELETE USING (
  auth.uid() = user_id
);

-- 2. Fix RLS policies for likes table
DROP POLICY IF EXISTS "Users can view likes" ON likes;
DROP POLICY IF EXISTS "Users can create likes" ON likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;

CREATE POLICY "Users can view likes" ON likes
FOR SELECT USING (true);

CREATE POLICY "Users can create likes" ON likes
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can delete their own likes" ON likes
FOR DELETE USING (
  auth.uid() = user_id
);

-- 3. Fix RLS policies for comments table
DROP POLICY IF EXISTS "Users can view comments" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

CREATE POLICY "Users can view comments" ON comments
FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON comments
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can update their own comments" ON comments
FOR UPDATE USING (
  auth.uid() = user_id
);

CREATE POLICY "Users can delete their own comments" ON comments
FOR DELETE USING (
  auth.uid() = user_id
);

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- 5. Ensure foreign key constraints are properly set up
-- (These should already exist, but let's make sure)

-- Check if foreign key constraints exist and add them if missing
DO $$
BEGIN
    -- Add foreign key for likes.post_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'likes_post_id_fkey' 
        AND table_name = 'likes'
    ) THEN
        ALTER TABLE likes ADD CONSTRAINT likes_post_id_fkey 
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for comments.post_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'comments_post_id_fkey' 
        AND table_name = 'comments'
    ) THEN
        ALTER TABLE comments ADD CONSTRAINT comments_post_id_fkey 
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
    END IF;
END $$; 