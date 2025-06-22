# Social Media App

A modern social media application built with Expo, React Native, NativeWind, and Supabase.

## Features

- 🔐 **Authentication**: Sign up, sign in, and secure user sessions
- 📱 **Feed**: Browse posts with like and comment functionality
- 🔍 **Search**: Find users and trending topics
- ➕ **Create Posts**: Share text and images with your followers
- 👤 **Profiles**: User profiles with posts grid, followers, and following
- 🌙 **Dark Mode**: Automatic dark/light mode support
- 📱 **Cross Platform**: Works on iOS, Android, and Web

## Tech Stack

- **Frontend**: React Native with Expo
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Supabase (PostgreSQL + Real-time + Auth)
- **Navigation**: Expo Router
- **Icons**: Expo Vector Icons
- **Storage**: AsyncStorage for local data

## Prerequisites

- Node.js (v18 or higher)
- Bun (recommended) or npm
- Expo CLI
- Supabase account

## Setup Instructions

### 1. Install Dependencies

```bash
# Install Supabase and other required packages
bun add @supabase/supabase-js @react-native-async-storage/async-storage expo-image-picker expo-camera expo-media-library expo-device
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your project URL and anon key from Settings > API
3. Update `lib/supabase.ts` with your credentials:

```typescript
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
```

### 3. Create Database Tables

Run these SQL commands in your Supabase SQL editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create likes table
CREATE TABLE likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  post_id UUID REFERENCES posts(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create comments table
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  post_id UUID REFERENCES posts(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create follows table
CREATE TABLE follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) NOT NULL,
  following_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Likes are viewable by everyone" ON likes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own likes" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" ON likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Follows are viewable by everyone" ON follows
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own follows" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follows" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 4. Configure Storage (Optional)

If you want to enable image uploads:

1. Go to Storage in your Supabase dashboard
2. Create a new bucket called `post-images`
3. Set the bucket to public
4. Update the storage policies as needed

### 5. Run the App

```bash
# Start the development server
bun start

# Run on iOS
bun ios

# Run on Android
bun android

# Run on Web
bun web
```

## Project Structure

```
app/
├── (tabs)/           # Tab navigation screens
│   ├── index.tsx     # Feed screen
│   ├── search.tsx    # Search screen
│   ├── create.tsx    # Create post screen
│   └── profile.tsx   # Profile screen
├── auth.tsx          # Authentication screen
├── _layout.tsx       # Root layout
└── index.tsx         # Entry point
lib/
└── supabase.ts       # Supabase configuration and helpers
```

## Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Features to Implement

- [ ] Image upload to Supabase Storage
- [ ] Push notifications
- [ ] Direct messaging
- [ ] Stories feature
- [ ] Advanced search filters
- [ ] Post sharing
- [ ] User blocking
- [ ] Content moderation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
