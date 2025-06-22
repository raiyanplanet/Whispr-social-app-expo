-- Simple post deletion function that bypasses RLS issues
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

-- Also create a function to check if a post exists
CREATE OR REPLACE FUNCTION check_post_exists(post_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(SELECT 1 FROM posts WHERE id = post_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 