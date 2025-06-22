-- Create missing tables for the social app

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints (drop first if they exist)
DO $$ 
BEGIN
    -- Drop existing constraints if they exist
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'likes_post_id_fkey') THEN
        ALTER TABLE likes DROP CONSTRAINT likes_post_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'comments_post_id_fkey') THEN
        ALTER TABLE comments DROP CONSTRAINT comments_post_id_fkey;
    END IF;
    
    -- Add new constraints
    ALTER TABLE likes ADD CONSTRAINT likes_post_id_fkey 
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
    
    ALTER TABLE comments ADD CONSTRAINT comments_post_id_fkey 
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
END $$;

-- Enable RLS on the new tables
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for likes table
DROP POLICY IF EXISTS "Users can insert their own likes" ON likes;
DROP POLICY IF EXISTS "Users can view likes" ON likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;

CREATE POLICY "Users can insert their own likes" ON likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view likes" ON likes
    FOR SELECT USING (true);

CREATE POLICY "Users can delete their own likes" ON likes
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for comments table
DROP POLICY IF EXISTS "Users can insert their own comments" ON comments;
DROP POLICY IF EXISTS "Users can view comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

CREATE POLICY "Users can insert their own comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view comments" ON comments
    FOR SELECT USING (true);

CREATE POLICY "Users can delete their own comments" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Update the test_post_deletion function to handle the case where tables might not exist
CREATE OR REPLACE FUNCTION test_post_deletion(post_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_user_id UUID;
    post_exists BOOLEAN;
    likes_count INTEGER;
    comments_count INTEGER;
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
    
    -- Delete likes if table exists
    BEGIN
        DELETE FROM likes WHERE likes.post_id = test_post_deletion.post_id;
        GET DIAGNOSTICS likes_count = ROW_COUNT;
    EXCEPTION WHEN undefined_table THEN
        likes_count := 0;
    END;
    
    -- Delete comments if table exists
    BEGIN
        DELETE FROM comments WHERE comments.post_id = test_post_deletion.post_id;
        GET DIAGNOSTICS comments_count = ROW_COUNT;
    EXCEPTION WHEN undefined_table THEN
        comments_count := 0;
    END;
    
    -- Delete the post
    DELETE FROM posts WHERE id = post_id AND user_id = current_user_id;
    
    -- Verify deletion
    SELECT EXISTS(SELECT 1 FROM posts WHERE id = post_id) INTO post_exists;
    
    IF post_exists THEN
        RETURN 'Post still exists after deletion';
    ELSE
        RETURN 'Post successfully deleted (likes: ' || likes_count || ', comments: ' || comments_count || ')';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 