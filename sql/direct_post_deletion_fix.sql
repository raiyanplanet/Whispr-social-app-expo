-- Direct post deletion fix
-- This script will fix the post deletion issue by creating a proper function and fixing RLS

-- First, let's create the simple deletion function
CREATE OR REPLACE FUNCTION delete_post_simple(post_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_user_id UUID;
    post_owner_id UUID;
    likes_deleted INTEGER;
    comments_deleted INTEGER;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN 'User not authenticated';
    END IF;
    
    -- Get post owner
    SELECT user_id INTO post_owner_id FROM posts WHERE id = post_id;
    
    IF post_owner_id IS NULL THEN
        RETURN 'Post not found';
    END IF;
    
    IF post_owner_id != current_user_id THEN
        RETURN 'User does not own this post';
    END IF;
    
    -- Delete likes (if table exists)
    BEGIN
        DELETE FROM likes WHERE likes.post_id = delete_post_simple.post_id;
        GET DIAGNOSTICS likes_deleted = ROW_COUNT;
    EXCEPTION WHEN undefined_table THEN
        likes_deleted := 0;
    END;
    
    -- Delete comments (if table exists)
    BEGIN
        DELETE FROM comments WHERE comments.post_id = delete_post_simple.post_id;
        GET DIAGNOSTICS comments_deleted = ROW_COUNT;
    EXCEPTION WHEN undefined_table THEN
        comments_deleted := 0;
    END;
    
    -- Delete the post
    DELETE FROM posts WHERE id = post_id;
    
    -- Check if deletion was successful
    IF NOT FOUND THEN
        RETURN 'Failed to delete post';
    END IF;
    
    RETURN 'Post deleted successfully (likes: ' || likes_deleted || ', comments: ' || comments_deleted || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a post exists
CREATE OR REPLACE FUNCTION check_post_exists(post_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(SELECT 1 FROM posts WHERE id = post_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now let's fix the RLS policies on posts table
-- First, disable RLS temporarily
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can view posts from friends" ON posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON posts;

-- Re-enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create new, simpler policies
CREATE POLICY "Users can insert their own posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all posts" ON posts
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own posts" ON posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON posts
    FOR DELETE USING (auth.uid() = user_id);

-- Also fix likes and comments tables if they exist
DO $$
BEGIN
    -- Fix likes table RLS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'likes') THEN
        ALTER TABLE likes DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can insert their own likes" ON likes;
        DROP POLICY IF EXISTS "Users can view likes" ON likes;
        DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;
        ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can insert their own likes" ON likes
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can view likes" ON likes
            FOR SELECT USING (true);
        CREATE POLICY "Users can delete their own likes" ON likes
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- Fix comments table RLS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') THEN
        ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can insert their own comments" ON comments;
        DROP POLICY IF EXISTS "Users can view comments" ON comments;
        DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
        ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can insert their own comments" ON comments
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can view comments" ON comments
            FOR SELECT USING (true);
        CREATE POLICY "Users can delete their own comments" ON comments
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create a test function to manually delete a specific post (for debugging)
CREATE OR REPLACE FUNCTION force_delete_post(post_id UUID)
RETURNS TEXT AS $$
DECLARE
    likes_deleted INTEGER;
    comments_deleted INTEGER;
BEGIN
    -- Delete likes
    BEGIN
        DELETE FROM likes WHERE likes.post_id = force_delete_post.post_id;
        GET DIAGNOSTICS likes_deleted = ROW_COUNT;
    EXCEPTION WHEN undefined_table THEN
        likes_deleted := 0;
    END;
    
    -- Delete comments
    BEGIN
        DELETE FROM comments WHERE comments.post_id = force_delete_post.post_id;
        GET DIAGNOSTICS comments_deleted = ROW_COUNT;
    EXCEPTION WHEN undefined_table THEN
        comments_deleted := 0;
    END;
    
    -- Delete the post
    DELETE FROM posts WHERE id = post_id;
    
    IF NOT FOUND THEN
        RETURN 'Post not found';
    END IF;
    
    RETURN 'Post force deleted (likes: ' || likes_deleted || ', comments: ' || comments_deleted || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 