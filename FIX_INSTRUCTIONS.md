# 🔧 FIX: Database Error Saving New User

## The Problem
You're getting "Database error saving new user" because the `profiles` table doesn't exist in your Supabase database.

## The Solution
Follow these exact steps:

### Step 1: Go to Your Supabase Dashboard
1. Open [supabase.com](https://supabase.com)
2. Sign in to your account
3. Click on your project: `ewsojaipfkuekybwjmoe`

### Step 2: Open SQL Editor
1. In the left sidebar, click **"SQL Editor"**
2. Click **"New query"** (the + button)

### Step 3: Run the Database Setup
1. Copy the ENTIRE content from the file `quick-fix.sql`
2. Paste it into the SQL Editor
3. Click the **"Run"** button (play button)

### Step 4: Verify Success
You should see success messages like:
- `CREATE TABLE`
- `ALTER TABLE`
- `CREATE POLICY`
- `CREATE FUNCTION`
- `CREATE TRIGGER`

### Step 5: Check Tables Were Created
1. In the left sidebar, click **"Table Editor"**
2. You should see these tables:
   - `profiles`
   - `posts`
   - `likes`

### Step 6: Test Your App
1. Go back to your app
2. Try creating a new account
3. It should work without the database error!

## If You Still Get Errors

### Check 1: Are you in the right project?
- Make sure you're in the project: `ewsojaipfkuekybwjmoe`
- The URL should be: `https://supabase.com/dashboard/project/ewsojaipfkuekybwjmoe`

### Check 2: Did the SQL run successfully?
- Look for any error messages in the SQL Editor
- All commands should show "success"

### Check 3: Are the tables visible?
- Go to Table Editor
- You should see `profiles`, `posts`, and `likes` tables

## What This Fix Does

1. **Creates the missing `profiles` table** - This is what was causing the error
2. **Sets up security policies** - So users can only access their own data
3. **Creates a trigger** - Automatically creates a profile when a user signs up
4. **Creates other tables** - For posts and likes functionality

## After the Fix

Once this works, you'll be able to:
- ✅ Create new user accounts
- ✅ Sign in with existing accounts
- ✅ Create posts
- ✅ Like/unlike posts
- ✅ View the social media feed

## Still Having Issues?

If you're still getting errors after following these steps:

1. **Check the Supabase logs:**
   - Go to **Logs** in your dashboard
   - Look for any error messages

2. **Try a simple test:**
   - Go to **Authentication** → **Users**
   - Try creating a user manually to see if the trigger works

3. **Contact me with:**
   - Screenshot of any error messages
   - What step you're stuck on 