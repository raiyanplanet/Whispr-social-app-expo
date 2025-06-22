-- Fix posts table structure and relationships
-- This script will ensure proper foreign key relationships exist

-- First, let's check and fix the posts table structure
DO $$
BEGIN
    -- Check if posts table exists and has the right structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
        -- Create posts table if it doesn't exist
        CREATE TABLE posts (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            content TEXT NOT NULL,
            image_url TEXT,
            user_id UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
    
    -- Check if user_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'user_id') THEN
        ALTER TABLE posts ADD COLUMN user_id UUID;
    END IF;
    
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'posts_user_id_fkey' 
        AND table_name = 'posts'
    ) THEN
        ALTER TABLE posts ADD CONSTRAINT posts_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key constraint to profiles table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'posts_user_id_profiles_fkey' 
        AND table_name = 'posts'
    ) THEN
        ALTER TABLE posts ADD CONSTRAINT posts_user_id_profiles_fkey 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS on posts table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own posts" ON posts;
DROP POLICY IF EXISTS "Users can view all posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

-- Create new policies
CREATE POLICY "Users can insert their own posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all posts" ON posts
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own posts" ON posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON posts
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);

-- Update the getPosts function to work without the foreign key relationship
CREATE OR REPLACE FUNCTION get_posts_with_profiles()
RETURNS TABLE (
    id UUID,
    content TEXT,
    image_url TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    profile_id UUID,
    profile_username TEXT,
    profile_full_name TEXT,
    profile_avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.content,
        p.image_url,
        p.user_id,
        p.created_at,
        p.updated_at,
        pr.id as profile_id,
        pr.username as profile_username,
        pr.full_name as profile_full_name,
        pr.avatar_url as profile_avatar_url
    FROM posts p
    LEFT JOIN profiles pr ON p.user_id = pr.id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 