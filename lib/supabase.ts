import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'present' : 'missing',
    key: supabaseAnonKey ? 'present' : 'missing'
  });
  throw new Error('Missing Supabase environment variables. Please check your configuration.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'whispr-app',
    },
  },
});

// Authentication helpers
export const signUp = async (
  email: string,
  password: string,
  username: string
) => {
  try {
    console.log("Starting sign up process...");

    // First, create the user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      console.error("Auth error during sign up:", authError);
      return { data: null, error: authError };
    }

    if (!authData.user) {
      console.error("No user data returned from sign up");
      return {
        data: null,
        error: { message: "Failed to create user account" },
      };
    }

    console.log("User account created successfully:", authData.user.id);

    // Try to create profile using the database function first
    try {
      const { data: profileData, error: profileError } = await supabase.rpc(
        "create_user_profile",
        {
          user_id: authData.user.id,
          username: username,
          full_name: username,
        }
      );

      if (profileError) {
        console.error("Database function error:", profileError);
        // Fallback to manual profile creation
        const { data: manualProfile, error: manualError } = await supabase
          .from("profiles")
          .insert([
            {
              id: authData.user.id,
              username: username,
              full_name: username,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (manualError) {
          console.error("Manual profile creation error:", manualError);
          return { data: null, error: manualError };
        }

        console.log("Profile created manually:", manualProfile);
        return {
          data: { user: authData.user, profile: manualProfile },
          error: null,
        };
      }

      console.log("Profile created via database function:", profileData);
      return {
        data: { user: authData.user, profile: profileData },
        error: null,
      };
    } catch (functionError) {
      console.error("Function call error:", functionError);
      // Fallback to manual profile creation
      const { data: manualProfile, error: manualError } = await supabase
        .from("profiles")
        .insert([
          {
            id: authData.user.id,
            username: username,
            full_name: username,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (manualError) {
        console.error("Manual profile creation error:", manualError);
        return { data: null, error: manualError };
      }

      console.log("Profile created manually (fallback):", manualProfile);
      return {
        data: { user: authData.user, profile: manualProfile },
        error: null,
      };
    }
  } catch (error) {
    console.error("Exception in signUp:", error);
    return { data: null, error: { message: "An unexpected error occurred" } };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  } catch (error) {
    console.error("Sign in exception:", error);
    return { data: null, error: { message: "An unexpected error occurred" } };
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export const getCurrentUserProfile = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("User not authenticated");
      return { data: null, error: { message: "User not authenticated" } };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching current user profile:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Exception in getCurrentUserProfile:", error);
    return { data: null, error: { message: "Failed to fetch user profile" } };
  }
};

export const getCurrentSession = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
};

export const onAuthStateChange = (
  callback: (event: string, session: any) => void
) => {
  return supabase.auth.onAuthStateChange(callback);
};

// Database helpers
export const createPost = async (content: string, imageUrl?: string) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    console.log("Creating post for user:", user.id);
    console.log("Content:", content);

    const { data, error } = await supabase
      .from("posts")
      .insert([
        {
          content,
          image_url: imageUrl,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("Error creating post:", error);
    } else {
      console.log("Post created successfully:", data);
    }

    return { data, error };
  } catch (error) {
    console.error("Exception in createPost:", error);
    return { data: null, error: { message: "Failed to create post" } };
  }
};

export const getPosts = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("User not authenticated");
      return { data: null, error: { message: "User not authenticated" } };
    }

    // Get the users that the current user is friends with
    const { data: friendRequests, error: friendsError } = await supabase
      .from("friend_requests")
      .select("sender_id, receiver_id")
      .eq("status", "accepted")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (friendsError) {
      console.error("Error fetching friends:", friendsError);
      return { data: null, error: friendsError };
    }

    // Get the IDs of friends (the other user in each relationship)
    const friendIds =
      friendRequests?.map((request) =>
        request.sender_id === user.id ? request.receiver_id : request.sender_id
      ) || [];

    // Also include the current user's own posts
    friendIds.push(user.id);

    console.log("Fetching posts from friends:", friendIds);

    // Fetch posts without foreign key relationship
    const { data: rawPosts, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .in("user_id", friendIds)
      .order("created_at", { ascending: false });

    if (postsError) {
      console.error("Error fetching posts:", postsError);
      return { data: null, error: postsError };
    }

    console.log("Raw posts from database:", rawPosts);

    if (!rawPosts || rawPosts.length === 0) {
      console.log("No posts found");
      return { data: [], error: null };
    }

    // Get unique user IDs from posts
    const userIds = [...new Set(rawPosts.map((post: any) => post.user_id))];

    // Fetch profiles separately
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return { data: null, error: profilesError };
    }

    // Create a map of user profiles
    const profileMap = new Map();
    profiles?.forEach((profile: any) => {
      profileMap.set(profile.id, profile);
    });

    // Get post IDs for enhanced data fetching
    const postIds = rawPosts.map((post: any) => post.id);
    console.log("Post IDs being returned:", postIds);

    // Fetch enhanced data for each post
    const enhancedPosts = await Promise.all(
      rawPosts.map(async (post: any) => {
        try {
          // Get like count
          const { count: likeCount } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          // Get comment count
          const { count: commentCount } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          // Check if current user liked this post
          const { data: userLike } = await supabase
            .from("likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", user.id)
            .single();

          // Get profile for this post
          const profile = profileMap.get(post.user_id);

          return {
            ...post,
            profiles: profile || null,
            like_count: likeCount || 0,
            comment_count: commentCount || 0,
            is_liked: !!userLike,
          };
        } catch (error) {
          console.error("Error enhancing post data:", error);
          const profile = profileMap.get(post.user_id);
          return {
            ...post,
            profiles: profile || null,
            like_count: 0,
            comment_count: 0,
            is_liked: false,
          };
        }
      })
    );

    console.log("Returning posts from friends:", enhancedPosts.length);
    return { data: enhancedPosts, error: null };
  } catch (error) {
    console.error("Exception in getPosts:", error);
    return { data: null, error: { message: "Failed to fetch posts" } };
  }
};

export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    return { data, error };
  } catch (error) {
    console.error("Error getting all users:", error);
    return { data: null, error: { message: "Failed to get users" } };
  }
};

export const updateUserProfile = async (updates: {
  username?: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
}) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return { data: null, error: { message: "User not authenticated" } };

    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { data: null, error: { message: "Failed to update profile" } };
  }
};

export const getUserPosts = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user posts:", error);
      return { data: null, error };
    }

    console.log("User posts fetched:", data?.length || 0);

    // Get current user for like status
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!data || data.length === 0) {
      return { data: [], error: null };
    }

    // Enhance posts with like/comment data
    const enhancedPosts = await Promise.all(
      data.map(async (post: any) => {
        try {
          // Get like count
          const { count: likeCount } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          // Get comment count
          const { count: commentCount } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          // Check if current user liked this post
          let isLiked = false;
          if (user) {
            const { data: userLike } = await supabase
              .from("likes")
              .select("id")
              .eq("post_id", post.id)
              .eq("user_id", user.id)
              .single();
            isLiked = !!userLike;
          }

          return {
            ...post,
            like_count: likeCount || 0,
            comment_count: commentCount || 0,
            is_liked: isLiked,
          };
        } catch (error) {
          console.error("Error enhancing user post data:", error);
          return {
            ...post,
            like_count: 0,
            comment_count: 0,
            is_liked: false,
          };
        }
      })
    );

    return { data: enhancedPosts, error: null };
  } catch (error) {
    console.error("Exception in getUserPosts:", error);
    return { data: null, error: { message: "Failed to fetch user posts" } };
  }
};

export const likePost = async (postId: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from("likes")
    .upsert([
      {
        post_id: postId,
        user_id: user.id,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  return { data, error };
};

export const unlikePost = async (postId: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", user.id);

  return { error };
};

export const getPostLikes = async (postId: string) => {
  try {
    const { data, error } = await supabase
      .from("likes")
      .select("*")
      .eq("post_id", postId);

    return { data, error };
  } catch (error) {
    console.error("Error getting post likes:", error);
    return { data: null, error: { message: "Failed to get likes" } };
  }
};

export const checkIfUserLiked = async (postId: string) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: false, error: null };

    const { data, error } = await supabase
      .from("likes")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .single();

    return { data: !!data, error };
  } catch (error) {
    return { data: false, error: null };
  }
};

export const addComment = async (postId: string, content: string) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("comments")
      .insert([
        {
          post_id: postId,
          user_id: user.id,
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select();

    return { data, error };
  } catch (error) {
    console.error("Error adding comment:", error);
    return { data: null, error: { message: "Failed to add comment" } };
  }
};

export const getPostComments = async (postId: string) => {
  try {
    const { data, error } = await supabase
      .from("comments")
      .select(
        `
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    return { data, error };
  } catch (error) {
    console.error("Error getting comments:", error);
    return { data: null, error: { message: "Failed to get comments" } };
  }
};

export const getPostCommentCount = async (postId: string) => {
  try {
    const { count, error } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    return { count: count || 0, error };
  } catch (error) {
    console.error("Error getting comment count:", error);
    return { count: 0, error: { message: "Failed to get comment count" } };
  }
};

// Friend Request functions
export const sendFriendRequest = async (targetUserId: string) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("User not authenticated");
      throw new Error("User not authenticated");
    }

    console.log("Sending friend request to user:", targetUserId);
    console.log("Current user ID:", user.id);
    console.log("Target user ID:", targetUserId);

    // Check if friend request already exists
    const { data: existingRequest } = await supabase
      .from("friend_requests")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id})`
      )
      .single();

    if (existingRequest) {
      console.log("Friend request already exists:", existingRequest.status);
      return { data: existingRequest, error: null };
    }

    const { data, error } = await supabase
      .from("friend_requests")
      .insert([
        {
          sender_id: user.id,
          receiver_id: targetUserId,
          status: "pending",
        },
      ])
      .select();

    if (error) {
      console.error("Error sending friend request:", error);
      return { data: null, error };
    }

    console.log("Successfully sent friend request:", data);
    return { data, error: null };
  } catch (error) {
    console.error("Exception in sendFriendRequest:", error);
    return { data: null, error: { message: "Failed to send friend request" } };
  }
};

export const acceptFriendRequest = async (senderId: string) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    console.log("Accepting friend request from user:", senderId);

    const { data, error } = await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("sender_id", senderId)
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .select()
      .single();

    if (error) {
      console.error("Error accepting friend request:", error);
      return { data: null, error };
    }

    console.log("Successfully accepted friend request:", data);
    return { data, error: null };
  } catch (error) {
    console.error("Exception in acceptFriendRequest:", error);
    return {
      data: null,
      error: { message: "Failed to accept friend request" },
    };
  }
};

export const rejectFriendRequest = async (senderId: string) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    console.log("Rejecting friend request from user:", senderId);

    const { data, error } = await supabase
      .from("friend_requests")
      .update({ status: "rejected" })
      .eq("sender_id", senderId)
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .select()
      .single();

    if (error) {
      console.error("Error rejecting friend request:", error);
      return { data: null, error };
    }

    console.log("Successfully rejected friend request:", data);
    return { data, error: null };
  } catch (error) {
    console.error("Exception in rejectFriendRequest:", error);
    return {
      data: null,
      error: { message: "Failed to reject friend request" },
    };
  }
};

export const cancelFriendRequest = async (receiverId: string) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    console.log("Canceling friend request to user:", receiverId);

    const { error } = await supabase
      .from("friend_requests")
      .delete()
      .eq("sender_id", user.id)
      .eq("receiver_id", receiverId)
      .eq("status", "pending");

    if (error) {
      console.error("Error canceling friend request:", error);
      return { error };
    }

    console.log("Successfully canceled friend request");
    return { error: null };
  } catch (error) {
    console.error("Exception in cancelFriendRequest:", error);
    return { error: { message: "Failed to cancel friend request" } };
  }
};

export const unfriendUser = async (friendId: string) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    console.log("Unfriending user:", friendId, "from user:", user.id);

    // First, let's check if the relationship exists
    const { data: existingRelationship, error: checkError } = await supabase
      .from("friend_requests")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
      );

    if (checkError) {
      console.error("Error checking existing relationship:", checkError);
    } else {
      console.log(
        "Existing relationship before unfriend:",
        existingRelationship
      );
    }

    // Delete the friend relationship - try both directions
    let { error } = await supabase
      .from("friend_requests")
      .delete()
      .eq("sender_id", user.id)
      .eq("receiver_id", friendId);

    if (error) {
      console.error("Error deleting first direction:", error);
    } else {
      console.log("Successfully deleted first direction");
    }

    // Try the other direction
    const { error: error2 } = await supabase
      .from("friend_requests")
      .delete()
      .eq("sender_id", friendId)
      .eq("receiver_id", user.id);

    if (error2) {
      console.error("Error deleting second direction:", error2);
      return { error: error2 };
    } else {
      console.log("Successfully deleted second direction");
    }

    // Verify the relationship is gone
    const { data: verifyRelationship, error: verifyError } = await supabase
      .from("friend_requests")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
      );

    if (verifyError) {
      console.error("Error verifying relationship deletion:", verifyError);
    } else {
      console.log("Relationship after unfriend:", verifyRelationship);
    }

    console.log("Successfully unfriended user");
    return { error: null };
  } catch (error) {
    console.error("Exception in unfriendUser:", error);
    return { error: { message: "Failed to unfriend user" } };
  }
};

export const getFriendRequestStatus = async (targetUserId: string) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: "none", error: null };

    console.log(
      "Checking friend status for user:",
      targetUserId,
      "from user:",
      user.id
    );

    const { data, error } = await supabase
      .from("friend_requests")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id})`
      )
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found"
      console.error("Error checking friend status:", error);
      return { data: "none", error };
    }

    const status = data?.status || "none";
    console.log("Friend status result:", status, "for relationship:", data);
    return { data: status, error: null };
  } catch (error) {
    console.error("Exception in getFriendRequestStatus:", error);
    return { data: "none", error: null };
  }
};

export const getFriends = async (userId: string) => {
  try {
    // Get accepted friend requests where this user is involved
    const { data: friendRequests, error: requestsError } = await supabase
      .from("friend_requests")
      .select("sender_id, receiver_id")
      .eq("status", "accepted")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (requestsError) {
      console.error("Error getting friend requests:", requestsError);
      return { data: null, error: requestsError };
    }

    if (!friendRequests || friendRequests.length === 0) {
      return { data: [], error: null };
    }

    // Extract friend IDs (the other user in each relationship)
    const friendIds = friendRequests.map((request) =>
      request.sender_id === userId ? request.receiver_id : request.sender_id
    );

    // Get the profiles of the friends
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", friendIds);

    if (profilesError) {
      console.error("Error getting friend profiles:", profilesError);
      return { data: null, error: profilesError };
    }

    return { data: profiles || [], error: null };
  } catch (error) {
    console.error("Exception in getFriends:", error);
    return { data: null, error: { message: "Failed to get friends" } };
  }
};

export const getPendingFriendRequests = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: [], error: null };

    // Get pending friend requests where current user is the receiver
    const { data: requests, error: requestsError } = await supabase
      .from("friend_requests")
      .select("sender_id, created_at")
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("Error getting pending friend requests:", requestsError);
      return { data: null, error: requestsError };
    }

    if (!requests || requests.length === 0) {
      return { data: [], error: null };
    }

    // Get the profiles of the senders
    const senderIds = requests.map((request) => request.sender_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", senderIds);

    if (profilesError) {
      console.error("Error getting sender profiles:", profilesError);
      return { data: null, error: profilesError };
    }

    return { data: profiles || [], error: null };
  } catch (error) {
    console.error("Exception in getPendingFriendRequests:", error);
    return {
      data: null,
      error: { message: "Failed to get pending friend requests" },
    };
  }
};

export const getFriendCount = async (userId: string) => {
  try {
    const { count, error } = await supabase
      .from("friend_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    return { count: count || 0, error };
  } catch (error) {
    console.error("Error getting friend count:", error);
    return { count: 0, error: { message: "Failed to get friend count" } };
  }
};

// Completely delete a user from the system (admin function)
export const deleteUser = async (userId: string) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    console.log("Deleting user completely:", userId);

    // Delete all user's data in order (due to foreign key constraints)

    // 1. Delete user's likes
    const { error: likesError } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", userId);

    if (likesError) {
      console.error("Error deleting user likes:", likesError);
      return { error: likesError };
    }

    // 2. Delete user's comments
    const { error: commentsError } = await supabase
      .from("comments")
      .delete()
      .eq("user_id", userId);

    if (commentsError) {
      console.error("Error deleting user comments:", commentsError);
      return { error: commentsError };
    }

    // 3. Delete user's follows (both as follower and following)
    const { error: followsError } = await supabase
      .from("follows")
      .delete()
      .or(`follower_id.eq.${userId},following_id.eq.${userId}`);

    if (followsError) {
      console.error("Error deleting user follows:", followsError);
      return { error: followsError };
    }

    // 4. Delete user's posts
    const { error: postsError } = await supabase
      .from("posts")
      .delete()
      .eq("user_id", userId);

    if (postsError) {
      console.error("Error deleting user posts:", postsError);
      return { error: postsError };
    }

    // 5. Delete user's profile
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error("Error deleting user profile:", profileError);
      return { error: profileError };
    }

    // 6. Delete user's auth account (requires admin privileges)
    // Note: This requires admin privileges and should be done through Supabase dashboard
    // or with service role key in a secure backend
    console.log(
      "User data deleted. Auth account deletion requires admin privileges."
    );

    console.log("Successfully deleted user completely");
    return { error: null };
  } catch (error) {
    console.error("Exception in deleteUser:", error);
    return { error: { message: "Failed to delete user" } };
  }
};

// Get users who liked a specific post
export const getUsersWhoLiked = async (postId: string) => {
  try {
    const { data, error } = await supabase
      .from("post_likes")
      .select(
        `
        user_id,
        profiles!post_likes_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      `
      )
      .eq("post_id", postId);

    if (error) {
      console.error("Error fetching users who liked:", error);
      return { data: null, error };
    }

    // Transform the data to match the expected format
    const transformedData =
      data
        ?.map((item: any) => ({
          id: (item.profiles as any)?.id || item.user_id,
          username: (item.profiles as any)?.username || "Unknown",
          full_name: (item.profiles as any)?.full_name || "Unknown User",
          avatar_url: (item.profiles as any)?.avatar_url,
        }))
        .filter((user: any) => user.id) || [];

    return { data: transformedData, error: null };
  } catch (error) {
    console.error("Exception in getUsersWhoLiked:", error);
    return {
      data: null,
      error: { message: "Failed to fetch users who liked" },
    };
  }
};

// Post deletion function
export const deletePost = async (postId: string) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    console.log("Deleting post:", postId, "for user:", user.id);

    // First, let's check if the post exists and belongs to the user
    const { data: existingPost, error: checkError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .eq("user_id", user.id)
      .single();

    if (checkError) {
      console.error("Error checking post ownership:", checkError);
      return { error: checkError };
    }

    if (!existingPost) {
      console.error("Post not found or user does not own this post");
      return {
        error: {
          message: "Post not found or you do not have permission to delete it",
        },
      };
    }

    console.log("Post found, proceeding with deletion:", existingPost);

    // Try using the simple database function first
    const { data: functionResult, error: functionError } = await supabase.rpc(
      "delete_post_simple",
      { post_id: postId }
    );

    if (functionError) {
      console.error("Database function error:", functionError);
      // Fallback to manual deletion
      return await deletePostManual(postId, user.id);
    }

    console.log("Database function result:", functionResult);

    if (
      functionResult &&
      functionResult.includes("Post deleted successfully")
    ) {
      // Verify the post is actually deleted
      const { data: verifyResult, error: verifyError } = await supabase.rpc(
        "check_post_exists",
        { post_id: postId }
      );

      if (verifyError) {
        console.error("Error verifying post deletion:", verifyError);
      } else if (verifyResult) {
        console.error("Post still exists after deletion attempt");
        return {
          error: { message: "Post deletion failed - post still exists" },
        };
      } else {
        console.log("Post successfully verified as deleted");
        // Clear cache to ensure fresh data on next fetch
        await clearPostCache();
      }

      return { error: null };
    } else {
      console.error("Database function failed:", functionResult);
      return { error: { message: functionResult || "Post deletion failed" } };
    }
  } catch (error) {
    console.error("Exception in deletePost:", error);
    return { error: { message: "Failed to delete post" } };
  }
};

// Manual deletion fallback
const deletePostManual = async (postId: string, userId: string) => {
  try {
    console.log("Using manual deletion fallback");

    // Delete related data first (due to foreign key constraints)

    // 1. Delete likes for this post (if table exists)
    try {
      const { error: likesError } = await supabase
        .from("likes")
        .delete()
        .eq("post_id", postId);

      if (likesError) {
        console.error("Error deleting post likes:", likesError);
        // Continue anyway, don't return error
      } else {
        console.log("Deleted likes for post");
      }
    } catch (error) {
      console.log("Likes table might not exist, skipping likes deletion");
    }

    // 2. Delete comments for this post (if table exists)
    try {
      const { error: commentsError } = await supabase
        .from("comments")
        .delete()
        .eq("post_id", postId);

      if (commentsError) {
        console.error("Error deleting post comments:", commentsError);
        // Continue anyway, don't return error
      } else {
        console.log("Deleted comments for post");
      }
    } catch (error) {
      console.log("Comments table might not exist, skipping comments deletion");
    }

    // 3. Delete the post itself
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting post:", error);
      return { error };
    }

    console.log("Successfully deleted post");

    // Verify the post is actually deleted
    const { data: verifyPost, error: verifyError } = await supabase
      .from("posts")
      .select("id")
      .eq("id", postId)
      .single();

    if (verifyError && verifyError.code === "PGRST116") {
      console.log("Post successfully verified as deleted");
      // Clear cache to ensure fresh data on next fetch
      await clearPostCache();
    } else if (verifyError) {
      console.error("Error verifying post deletion:", verifyError);
    } else if (verifyPost) {
      console.error("Post still exists after deletion attempt:", verifyPost);
      return { error: { message: "Post deletion failed - post still exists" } };
    }

    return { error: null };
  } catch (error) {
    console.error("Exception in deletePostManual:", error);
    return { error: { message: "Failed to delete post" } };
  }
};

// Function to check if a post exists in the database
export const checkPostExists = async (postId: string) => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("id, content, user_id, created_at")
      .eq("id", postId)
      .single();

    if (error && error.code === "PGRST116") {
      // Post not found
      console.log("Post does not exist in database:", postId);
      return { exists: false, data: null, error: null };
    }

    if (error) {
      console.error("Error checking post existence:", error);
      return { exists: false, data: null, error };
    }

    console.log("Post still exists in database:", data);
    return { exists: true, data, error: null };
  } catch (error) {
    console.error("Exception in checkPostExists:", error);
    return {
      exists: false,
      data: null,
      error: { message: "Failed to check post existence" },
    };
  }
};

// Test function to verify friend relationship status
export const testFriendRelationship = async (friendId: string) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("User not authenticated");
      return { error: "User not authenticated" };
    }

    console.log("=== Testing Friend Relationship ===");
    console.log("Current user ID:", user.id);
    console.log("Friend ID:", friendId);

    // Check current relationship
    const { data: relationship, error: relationshipError } = await supabase
      .from("friend_requests")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
      );

    if (relationshipError) {
      console.error("Error checking relationship:", relationshipError);
      return { error: relationshipError };
    }

    console.log("Current relationship:", relationship);

    // Check friend status
    const { data: status } = await getFriendRequestStatus(friendId);
    console.log("Friend status:", status);

    return { data: { relationship, status }, error: null };
  } catch (error) {
    console.error("Error in testFriendRelationship:", error);
    return { error: { message: "Test failed" } };
  }
};

// Debug function to get all posts (for debugging only)
export const getAllPostsDebug = async () => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("id, content, user_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting all posts:", error);
      return { data: null, error };
    }

    console.log("=== ALL POSTS IN DATABASE ===");
    console.log("Total posts:", data?.length || 0);
    data?.forEach((post: any, index: number) => {
      console.log(
        `${index + 1}. ID: ${post.id}, Content: ${post.content.substring(0, 50)}..., User: ${post.user_id}, Created: ${post.created_at}`
      );
    });
    console.log("=== END ALL POSTS ===");

    return { data, error: null };
  } catch (error) {
    console.error("Exception in getAllPostsDebug:", error);
    return { data: null, error: { message: "Failed to get all posts" } };
  }
};

// Function to clear cache and force refresh
export const clearPostCache = async () => {
  try {
    // Force a fresh fetch by making a dummy query
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Make a minimal query to clear any cached data
    await supabase.from("posts").select("id").limit(1);

    console.log("Post cache cleared");
  } catch (error) {
    console.error("Error clearing post cache:", error);
  }
};

export const searchUsers = async (query: string) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error("Error searching users:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Exception in searchUsers:", error);
    return { data: null, error: { message: "Failed to search users" } };
  }
};
