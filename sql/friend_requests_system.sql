-- Facebook-like Friend Request System
-- This replaces the follows system with a proper friend request system

-- Drop the existing follows table
DROP TABLE IF EXISTS follows CASCADE;

-- Create friend_requests table
CREATE TABLE friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

-- Enable Row Level Security
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view friend requests they're involved in
CREATE POLICY "Users can view their friend requests" ON friend_requests
FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Policy to allow users to send friend requests
CREATE POLICY "Users can send friend requests" ON friend_requests
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND sender_id != receiver_id
);

-- Policy to allow users to update friend requests they received
CREATE POLICY "Users can update friend requests they received" ON friend_requests
FOR UPDATE USING (
  auth.uid() = receiver_id
);

-- Policy to allow users to delete friend requests they sent
CREATE POLICY "Users can delete friend requests they sent" ON friend_requests
FOR DELETE USING (
  auth.uid() = sender_id
);

-- Create indexes for better performance
CREATE INDEX idx_friend_requests_sender_id ON friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver_id ON friend_requests(receiver_id);
CREATE INDEX idx_friend_requests_status ON friend_requests(status);
CREATE INDEX idx_friend_requests_created_at ON friend_requests(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_friend_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW EXECUTE FUNCTION update_friend_requests_updated_at();

-- Function to handle user deletion cleanup
CREATE OR REPLACE FUNCTION handle_user_deletion_friend_requests()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all friend requests where the deleted user was either sender or receiver
  DELETE FROM friend_requests 
  WHERE sender_id = OLD.id OR receiver_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to clean up friend requests when user is deleted
DROP TRIGGER IF EXISTS on_user_deletion_friend_requests ON auth.users;
CREATE TRIGGER on_user_deletion_friend_requests
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_deletion_friend_requests();

-- Update posts RLS policy to only show posts from friends or the user themselves
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
CREATE POLICY "Posts are viewable by friends and self" ON posts
FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM friend_requests 
    WHERE status = 'accepted' 
    AND (
      (sender_id = auth.uid() AND receiver_id = user_id) OR
      (sender_id = user_id AND receiver_id = auth.uid())
    )
  )
);

-- Helper functions for friend requests

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friend_requests 
    WHERE status = 'accepted' 
    AND (
      (sender_id = user1_id AND receiver_id = user2_id) OR
      (sender_id = user2_id AND receiver_id = user1_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get friend request status between two users
CREATE OR REPLACE FUNCTION get_friend_request_status(user1_id UUID, user2_id UUID)
RETURNS TEXT AS $$
DECLARE
  request_status TEXT;
BEGIN
  SELECT status INTO request_status
  FROM friend_requests 
  WHERE (sender_id = user1_id AND receiver_id = user2_id) OR
        (sender_id = user2_id AND receiver_id = user1_id)
  LIMIT 1;
  
  RETURN COALESCE(request_status, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 