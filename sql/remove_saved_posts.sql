-- Remove saved_posts table and related functionality
-- Drop the saved_posts table
DROP TABLE IF EXISTS saved_posts CASCADE;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_user_deletion_saved_posts ON auth.users;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS handle_user_deletion_saved_posts();

-- Remove any related indexes (they will be dropped with the table)
-- The table and all its dependencies will be removed 