# Supabase Setup Guide for Social Media App

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - Name: `social-app` (or any name you prefer)
   - Database Password: Create a strong password
   - Region: Choose closest to you
6. Click "Create new project"
7. Wait for the project to be created (this may take a few minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## Step 3: Update Your App Configuration

1. Open `lib/supabase.ts` in your project
2. Replace the placeholder values:

```typescript
const supabaseUrl = 'YOUR_PROJECT_URL_HERE';
const supabaseAnonKey = 'YOUR_ANON_KEY_HERE';
```

For example:
```typescript
const supabaseUrl = 'https://abcdefghijklm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## Step 4: Set Up Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the entire content from `database-setup.sql`
4. Click "Run" to execute the script
5. You should see success messages for all the tables and policies

## Step 5: Configure Authentication

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Under "Site URL", add your app's URL:
   - For development: `http://localhost:8081` (or your Expo dev server URL)
   - For production: Your actual domain
3. Under "Redirect URLs", add:
   - `http://localhost:8081/**`
   - `exp://localhost:8081/**`
   - Your production URLs if any

## Step 6: Test the Setup

1. Start your app:
   ```bash
   bun start
   ```

2. Try to create a new account:
   - Go to the auth screen
   - Click "Sign Up"
   - Enter email, password, and username
   - Submit the form

3. Check if the user was created:
   - Go to **Authentication** → **Users** in Supabase dashboard
   - You should see your new user listed
   - Go to **Table Editor** → **profiles** to see the profile record

## Troubleshooting

### "Database error saving new user"

This usually means:
1. **Tables not created**: Make sure you ran the SQL script
2. **Wrong credentials**: Check your Supabase URL and anon key
3. **RLS policies**: The SQL script should have created all necessary policies

### "User not authenticated"

This means:
1. **Auth not configured**: Check your authentication settings
2. **Session not persisting**: Check the storage configuration

### "Permission denied"

This means:
1. **RLS policies missing**: Run the SQL script again
2. **Wrong user context**: Make sure you're signed in

## Common Issues and Solutions

### Issue: "relation 'profiles' does not exist"
**Solution**: Run the database setup SQL script

### Issue: "permission denied for table profiles"
**Solution**: Check that RLS policies were created properly

### Issue: "invalid input syntax for type uuid"
**Solution**: Make sure the UUID extension is enabled

### Issue: "duplicate key value violates unique constraint"
**Solution**: The username already exists, try a different username

## Verification Checklist

- [ ] Supabase project created
- [ ] Project URL and anon key copied
- [ ] `lib/supabase.ts` updated with real credentials
- [ ] Database setup SQL script executed
- [ ] Authentication settings configured
- [ ] User registration works
- [ ] User profile is created automatically
- [ ] Posts can be created
- [ ] Feed loads posts

## Next Steps

Once everything is working:
1. Add image upload functionality
2. Implement real-time features
3. Add push notifications
4. Deploy to production

## Support

If you're still having issues:
1. Check the Supabase logs in the dashboard
2. Look at the browser console for errors
3. Verify all steps in this guide were completed
4. Check that your Supabase project is active and not paused 