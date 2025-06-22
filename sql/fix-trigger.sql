-- FIX: Better Database Trigger for User Creation
-- Run this in your Supabase SQL Editor

-- 1. Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop the existing function if it exists
DROP FUNCTION IF EXISTS handle_new_user();

-- 3. Create a more robust function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with better error handling
  INSERT INTO profiles (id, username, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. Test the trigger by checking if it exists
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 6. Also create a simpler version without the trigger for manual profile creation
CREATE OR REPLACE FUNCTION create_user_profile(user_id UUID, username TEXT, full_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name, created_at, updated_at)
  VALUES (user_id, username, full_name, NOW(), NOW());
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 