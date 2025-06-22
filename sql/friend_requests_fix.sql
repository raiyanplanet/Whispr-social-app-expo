-- Fix RLS policies for friend_requests table to ensure proper deletion
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can update their own friend requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can delete their own friend requests" ON friend_requests;

-- Create comprehensive RLS policies for friend_requests table
-- Policy to allow users to view friend requests they're involved in
CREATE POLICY "Users can view their own friend requests" ON friend_requests
FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Policy to allow users to send friend requests
CREATE POLICY "Users can send friend requests" ON friend_requests
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

-- Policy to allow users to update friend requests they're involved in
CREATE POLICY "Users can update their own friend requests" ON friend_requests
FOR UPDATE USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Policy to allow users to delete friend requests they're involved in
CREATE POLICY "Users can delete their own friend requests" ON friend_requests
FOR DELETE USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Add index for better performance on friend relationship queries
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_receiver ON friend_requests(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_sender ON friend_requests(receiver_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status); 