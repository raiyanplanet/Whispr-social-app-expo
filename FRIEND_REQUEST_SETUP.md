# Facebook-like Friend Request System Setup

This guide will help you set up the new friend request system that replaces the old follow system.

## What's Changed

### Database Changes
- **Removed**: `follows` table
- **Added**: `friend_requests` table with status field (pending, accepted, rejected)
- **Updated**: Posts visibility - now only shows posts from friends

### New Features
- ✅ Send friend requests
- ✅ Accept/reject friend requests  
- ✅ Cancel pending requests
- ✅ Unfriend users
- ✅ Posts only visible to friends
- ✅ Friend request notifications
- ✅ Real-time badge updates
- ✅ **NEW**: User profile detail screen
- ✅ **NEW**: Clickable users throughout the app

## Setup Instructions

### 1. Run the Database Migration

Copy and paste the entire contents of `friend_requests_system.sql` into your Supabase SQL Editor and run it.

This will:
- Drop the old `follows` table
- Create the new `friend_requests` table
- Set up proper RLS policies
- Update posts visibility policy
- Create helper functions

### 2. Updated Functions

The following functions have been updated in `lib/supabase.ts`:

**Old Functions (Removed):**
- `followUser()`
- `unfollowUser()`
- `checkIfFollowing()`
- `getFollowers()`
- `getFollowing()`
- `getFollowerCount()`
- `getFollowingCount()`

**New Functions (Added):**
- `sendFriendRequest(targetUserId)`
- `acceptFriendRequest(senderId)`
- `rejectFriendRequest(senderId)`
- `cancelFriendRequest(receiverId)`
- `unfriendUser(friendId)`
- `getFriendRequestStatus(targetUserId)`
- `getFriends(userId)`
- `getPendingFriendRequests()`
- `getFriendCount(userId)`

### 3. Updated UI Components

**Search Screen (`app/(tabs)/search.tsx`):**
- Shows "Add Friend" button for users you're not friends with
- Shows "Cancel Request" for pending requests you sent
- Shows "Friends" for accepted friends with unfriend option
- **NEW**: Users are clickable and navigate to profile detail screen

**Profile Screen (`app/(tabs)/profile.tsx`):**
- Shows friend count instead of follower count
- Shows pending request count with notification badge
- Friend list modal instead of followers/following
- Pending requests modal with accept/reject buttons
- **NEW**: Friends in the modal are clickable

**Tab Layout (`app/(tabs)/_layout.tsx`):**
- Added notification badge on profile tab for pending requests
- Auto-refreshes every 30 seconds

**Feed (`app/(tabs)/index.tsx`):**
- Now only shows posts from friends (including your own posts)
- **NEW**: Post authors are clickable and navigate to profile detail screen
- Updated empty state message to mention friends instead of following

**NEW: User Profile Detail Screen (`app/user-profile.tsx`):**
- Shows detailed user profile information
- Displays user's posts (only if friends or own profile)
- Friend request management (send, accept, cancel, unfriend)
- Privacy-focused: posts only visible to friends
- Back navigation to previous screen

## How It Works

### Friend Request Flow
1. **Send Request**: User A sends friend request to User B
2. **Pending State**: Request shows as "pending" for both users
3. **Accept/Reject**: User B can accept or reject the request
4. **Friends**: If accepted, both users become friends and can see each other's posts
5. **Unfriend**: Either user can unfriend the other, removing the relationship

### Post Visibility
- **Before**: All posts were visible to everyone
- **After**: Posts are only visible to friends and the post author
- **Feed**: Shows posts from friends + your own posts
- **Profile**: Users can still see their own posts

### User Profile Detail Screen
- **Access**: Click on any user throughout the app
- **Privacy**: Shows posts only if you're friends or viewing your own profile
- **Friend Management**: Send requests, accept/reject, unfriend directly from profile
- **Navigation**: Back button returns to previous screen

### Notifications
- Profile tab shows red badge with number of pending requests
- Badge updates automatically every 30 seconds
- Users can view and manage requests from profile screen

## Testing the System

1. **Create two test accounts**
2. **Send friend request** from one account to another
3. **Check pending requests** on the receiving account
4. **Accept the request** and verify both users become friends
5. **Create posts** and verify they only appear in friends' feeds
6. **Test unfriend functionality**
7. **Test user profile detail screen** by clicking on users
8. **Verify privacy** - posts only visible to friends

## Migration Notes

- Existing follow relationships will be lost when you run the migration
- Users will need to send new friend requests to see each other's posts
- The system is designed to be privacy-focused like Facebook

## Troubleshooting

**Posts not showing up?**
- Make sure both users are friends (accepted friend requests)
- Check that the posts RLS policy was updated correctly

**Friend requests not working?**
- Verify the `friend_requests` table was created properly
- Check RLS policies are in place
- Ensure user authentication is working

**Badge not updating?**
- Check the interval timer in the tab layout
- Verify `getPendingFriendRequests()` function is working

**User profile detail screen not working?**
- Check that the route `/user-profile` is properly set up
- Verify the `userId` parameter is being passed correctly
- Ensure the user profile query is working

## Security Features

- Row Level Security (RLS) policies ensure users can only:
  - View friend requests they're involved in
  - Send requests to other users (not themselves)
  - Accept/reject requests sent to them
  - Cancel requests they sent
- Posts are automatically filtered by friendship status
- All operations require user authentication
- User profile detail screen respects privacy settings 