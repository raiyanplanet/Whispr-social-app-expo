import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Dimensions,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useTheme } from "../../contexts/ThemeContext";
import {
    acceptFriendRequest,
    checkIfUserLiked,
    deletePost,
    getCurrentUserProfile,
    getFriendCount,
    getFriends,
    getPendingFriendRequests,
    getPostCommentCount,
    getPostLikes,
    getUserPosts,
    likePost,
    rejectFriendRequest,
    signOut,
    unlikePost,
    updateUserProfile,
} from "../../lib/supabase";

const { width } = Dimensions.get("window");

// Storage keys for caching
const STORAGE_KEYS = {
  USER_PROFILE: '@profile_user_data',
  USER_POSTS: '@profile_user_posts',
  FRIEND_COUNT: '@profile_friend_count',
  PENDING_REQUESTS_COUNT: '@profile_pending_requests_count',
  LAST_UPDATE: '@profile_last_update',
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface UserPost {
  id: string;
  content: string;
  image_url?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

interface FriendUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    full_name: "",
    bio: "",
  });

  // Friends and friend requests
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendUser[]>([]);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [requestsModalVisible, setRequestsModalVisible] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  // Cache management functions
  const isCacheValid = async (): Promise<boolean> => {
    try {
      const lastUpdate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_UPDATE);
      if (!lastUpdate) return false;
      
      const lastUpdateTime = parseInt(lastUpdate);
      const now = Date.now();
      return (now - lastUpdateTime) < CACHE_DURATION;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  };

  const saveToCache = async (data: any, key: string) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving to cache (${key}):`, error);
    }
  };

  const loadFromCache = async (key: string) => {
    try {
      const cached = await AsyncStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error(`Error loading from cache (${key}):`, error);
      return null;
    }
  };

  const clearCache = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.USER_POSTS,
        STORAGE_KEYS.FRIEND_COUNT,
        STORAGE_KEYS.PENDING_REQUESTS_COUNT,
        STORAGE_KEYS.LAST_UPDATE,
      ]);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const updateCacheTimestamp = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE, Date.now().toString());
    } catch (error) {
      console.error('Error updating cache timestamp:', error);
    }
  };

  const loadUserData = async (forceRefresh = false) => {
    try {
      setLoading(true);

      // Check if we should use cached data
      const cacheValid = await isCacheValid();
      const shouldUseCache = !forceRefresh && cacheValid;

      if (shouldUseCache) {
        // Load from cache
        const [cachedUser, cachedPosts, cachedFriendCount, cachedPendingCount] = await Promise.all([
          loadFromCache(STORAGE_KEYS.USER_PROFILE),
          loadFromCache(STORAGE_KEYS.USER_POSTS),
          loadFromCache(STORAGE_KEYS.FRIEND_COUNT),
          loadFromCache(STORAGE_KEYS.PENDING_REQUESTS_COUNT),
        ]);

        if (cachedUser) {
          setUser(cachedUser);
          setPosts(cachedPosts || []);
          setFriendCount(cachedFriendCount || 0);
          setPendingRequestCount(cachedPendingCount || 0);
          setLoading(false);
          return;
        }
      }

      // Fetch fresh data from server
      const { data: userData, error: userError } = await getCurrentUserProfile();
      if (userError) {
        console.error("Error loading user profile:", userError);
        Alert.alert("Error", "Failed to load profile");
        return;
      }

      if (userData) {
        setUser(userData);
        
        // Save user data to cache
        await saveToCache(userData, STORAGE_KEYS.USER_PROFILE);

        // Get user posts
        await loadUserPosts(userData.id);

        // Get friend count and pending requests
        const [friendsCountResult, pendingRequestsResult] = await Promise.all([
          getFriendCount(userData.id),
          getPendingFriendRequests()
        ]);

        const friendsCount = friendsCountResult.count || 0;
        const pendingCount = pendingRequestsResult.data?.length || 0;

        setFriendCount(friendsCount);
        setPendingRequestCount(pendingCount);

        // Save counts to cache
        await Promise.all([
          saveToCache(friendsCount, STORAGE_KEYS.FRIEND_COUNT),
          saveToCache(pendingCount, STORAGE_KEYS.PENDING_REQUESTS_COUNT),
        ]);

        // Update cache timestamp
        await updateCacheTimestamp();
      }
    } catch (error) {
      console.error("Error in loadUserData:", error);
      Alert.alert("Error", "Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosts = async (userId: string) => {
    try {
      const { data: postsData, error: postsError } = await getUserPosts(userId);
      if (postsError) {
        console.error("Error loading user posts:", postsError);
        return;
      }

      // Enhance posts with likes, comments, and like status
      const enhancedPosts = await Promise.all(
        (postsData || []).map(async (post) => {
          const [likesData, userLikedData, commentCountData] =
            await Promise.all([
              getPostLikes(post.id),
              checkIfUserLiked(post.id),
              getPostCommentCount(post.id),
            ]);

          return {
            ...post,
            likes_count: likesData.data?.length || 0,
            is_liked: userLikedData.data || false,
            comments_count: commentCountData.count || 0,
          };
        })
      );

      setPosts(enhancedPosts);
      
      // Save posts to cache
      await saveToCache(enhancedPosts, STORAGE_KEYS.USER_POSTS);
    } catch (error) {
      console.error("Error loading user posts:", error);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  // Refresh data when screen comes into focus (e.g., when returning from profile)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if cache is invalid
      loadUserData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData(true); // Force refresh
    setRefreshing(false);
  };

  const loadFriends = async () => {
    if (!user) return;

    try {
      const { data, error } = await getFriends(user.id);
      if (error) {
        console.error("Error loading friends:", error);
        Alert.alert("Error", "Failed to load friends");
      } else {
        setFriends(data || []);
        setFriendsModalVisible(true);
      }
    } catch (error) {
      console.error("Error loading friends:", error);
      Alert.alert("Error", "Failed to load friends");
    }
  };

  const loadPendingRequests = async () => {
    try {
      const { data, error } = await getPendingFriendRequests();
      if (error) {
        console.error("Error loading pending requests:", error);
        Alert.alert("Error", "Failed to load pending requests");
      } else {
        setPendingRequests(data || []);
        setRequestsModalVisible(true);
      }
    } catch (error) {
      console.error("Error loading pending requests:", error);
      Alert.alert("Error", "Failed to load pending requests");
    }
  };

  const handleAcceptRequest = async (senderId: string, senderName: string) => {
    try {
      const { error } = await acceptFriendRequest(senderId);
      if (error) {
        Alert.alert("Error", "Failed to accept friend request");
      } else {
        // Remove from pending requests and update counts
        setPendingRequests((prev) => prev.filter((r) => r.id !== senderId));
        setPendingRequestCount((prev) => Math.max(0, prev - 1));
        setFriendCount((prev) => prev + 1);
        Alert.alert("Success", `Friend request from ${senderName} accepted!`);
      }
    } catch (error) {
      console.error("Error accepting friend request:", error);
      Alert.alert("Error", "Failed to accept friend request");
    }
  };

  const handleRejectRequest = async (senderId: string, senderName: string) => {
    try {
      const { error } = await rejectFriendRequest(senderId);
      if (error) {
        Alert.alert("Error", "Failed to reject friend request");
      } else {
        // Remove from pending requests
        setPendingRequests((prev) => prev.filter((r) => r.id !== senderId));
        setPendingRequestCount((prev) => Math.max(0, prev - 1));
        Alert.alert("Success", `Friend request from ${senderName} rejected`);
      }
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      Alert.alert("Error", "Failed to reject friend request");
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const { error } = post.is_liked
        ? await unlikePost(postId)
        : await likePost(postId);

      if (error) {
        console.error("Error toggling like:", error);
        return;
      }

      // Update local state
      const updatedPosts = posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              likes_count: p.is_liked ? (p.likes_count || 1) - 1 : (p.likes_count || 0) + 1,
              is_liked: !p.is_liked,
            }
          : p
      );

      setPosts(updatedPosts);
      
      // Update cached posts
      await saveToCache(updatedPosts, STORAGE_KEYS.USER_POSTS);
    } catch (error) {
      console.error("Error handling like:", error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await deletePost(postId);
              if (error) {
                console.error("Error deleting post:", error);
                Alert.alert("Error", "Failed to delete post");
                return;
              }

              // Remove post from local state
              setPosts((prevPosts) =>
                prevPosts.filter((post) => post.id !== postId)
              );

              // Clear cache to ensure fresh data
              await clearCache();

              Alert.alert("Success", "Post deleted successfully");
            } catch (error) {
              console.error("Error in handleDeletePost:", error);
              Alert.alert("Error", "Failed to delete post");
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = async () => {
    if (!user) return;

    setEditing(true);
    try {
      const { error } = await updateUserProfile({
        username: editForm.username,
        full_name: editForm.full_name,
        bio: editForm.bio,
      });

      if (error) {
        Alert.alert("Error", "Failed to update profile");
        return;
      }

      // Update local state
      setUser({
        ...user,
        username: editForm.username,
        full_name: editForm.full_name,
        bio: editForm.bio,
      });

      // Clear cache to force fresh data on next load
      await clearCache();

      setEditModalVisible(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setEditing(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await signOut();
            if (error) {
              console.error("Error signing out:", error);
              Alert.alert("Error", "Failed to sign out");
            } else {
              router.replace("/auth");
            }
          } catch (error) {
            console.error("Error in handleSignOut:", error);
            Alert.alert("Error", "Failed to sign out");
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const renderPost = ({ item }: { item: UserPost }) => (
    <View
      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      className="rounded-2xl border overflow-hidden shadow-sm">
      {/* Post Header - Simplified */}
      <View className="flex-row items-center justify-between p-4">
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mr-3 flex items-center justify-center">
            <Text className="text-white font-bold text-lg">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <View className="flex-1">
            <Text style={{ color: colors.text }} className="font-semibold text-base">
              {user?.full_name || "No Name Set"}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm">
              {formatDate(item.created_at)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleDeletePost(item.id)}
          className="p-2 rounded-full"
          style={{ backgroundColor: colors.border }}>
          <Ionicons
            name="trash-outline"
            size={16}
            color={colors.error}
          />
        </TouchableOpacity>
      </View>

      {/* Post Content - Cleaner */}
      <View className="px-4 pb-4">
        <Text
          style={{ color: colors.text }}
          className="text-base leading-6">
          {item.content}
        </Text>
        {item.image_url && (
          <View
            style={{ backgroundColor: colors.border }}
            className="w-full h-48 rounded-xl mt-3 overflow-hidden">
            <View
              style={{ backgroundColor: colors.border }}
              className="w-full h-full flex items-center justify-center">
              <Ionicons
                name="image-outline"
                size={40}
                color={colors.textSecondary}
              />
            </View>
          </View>
        )}
      </View>

      {/* Post Actions - Minimalistic */}
      <View
        style={{ borderTopColor: colors.border }}
        className="flex-row items-center justify-between px-4 py-3 border-t">
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => handleLikePost(item.id)}>
          <Ionicons
            name={item.is_liked ? "heart" : "heart-outline"}
            size={18}
            color={item.is_liked ? colors.error : colors.textSecondary}
          />
          <Text
            style={{
              color: item.is_liked ? colors.error : colors.textSecondary,
            }}
            className="ml-2 text-sm font-medium">
            {item.likes_count || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center">
          <Ionicons
            name="chatbubble-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={{ color: colors.textSecondary }} className="ml-2 text-sm font-medium">
            {item.comments_count || 0}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={{ backgroundColor: colors.background }}
        className="flex-1">
        <View className="flex-1 items-center justify-center">
          <View className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full items-center justify-center mb-4">
            <Ionicons name="person" size={32} color="white" />
          </View>
          <Text style={{ color: colors.textSecondary }} className="text-lg">
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView
        style={{ backgroundColor: colors.background }}
        className="flex-1">
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: colors.textSecondary }}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ backgroundColor: colors.background }}
      className="flex-1">
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        }}
        className="px-4 py-4 border-b flex-row items-center justify-between">
        <Text style={{ color: colors.text }} className="text-2xl font-bold">
          Profile
        </Text>
        <View className="flex-row items-center space-x-3">
          <ThemeToggle size="small" />
          <TouchableOpacity onPress={handleSignOut} className="p-2">
            <Ionicons name="log-out-outline" size={25} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Profile Header - Minimalistic */}
        <View style={{ backgroundColor: colors.surface }} className="p-6">
          <View className="items-center mb-6">
            <View className="w-24 h-24 bg-blue-500 rounded-full mb-4 flex items-center justify-center shadow-lg">
              <Text className="text-white font-bold text-3xl">
                {user.username?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <Text style={{ color: colors.text }} className="text-2xl font-bold mb-1">
              {user.full_name || "No Name Set"}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-base mb-3">
              @{user.username}
            </Text>
            {user.bio && (
              <Text style={{ color: colors.textSecondary }} className="text-center text-sm leading-5 max-w-xs">
                {user.bio}
              </Text>
            )}
          </View>

          {/* Stats Row - Simplified */}
          <View className="flex-row justify-around py-4">
            <TouchableOpacity onPress={loadFriends} className="items-center">
              <Text style={{ color: colors.text }} className="text-2xl font-bold">
                {friendCount}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm">
                Friends
              </Text>
            </TouchableOpacity>

            <View style={{ backgroundColor: colors.border }} className="w-px h-8" />

            <TouchableOpacity
              onPress={loadPendingRequests}
              className="items-center">
              <Text style={{ color: colors.text }} className="text-2xl font-bold">
                {pendingRequestCount}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm">
                Requests
              </Text>
            </TouchableOpacity>

            <View style={{ backgroundColor: colors.border }} className="w-px h-8" />

            <View className="items-center">
              <Text style={{ color: colors.text }} className="text-2xl font-bold">
                {posts.length}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm">
                Posts
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              setEditForm({
                username: user.username || "",
                full_name: user.full_name || "",
                bio: user.bio || "",
              });
              setEditModalVisible(true);
            }}
            style={{ backgroundColor: colors.primary }}
            className="py-3 rounded-xl mt-4">
            <Text className="text-white text-center font-semibold">
              Edit Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* Posts Section - Cleaner */}
        <View style={{ backgroundColor: colors.background }} className="mt-2">
          <View className="px-6 py-4">
            <Text
              style={{ color: colors.text }}
              className="text-lg font-semibold">
              Posts ({posts.length})
            </Text>
          </View>

          {posts.length === 0 ? (
            <View className="items-center py-16">
              <View style={{ backgroundColor: colors.border }} className="w-16 h-16 rounded-full items-center justify-center mb-4">
                <Ionicons
                  name="document-outline"
                  size={32}
                  color={colors.textSecondary}
                />
              </View>
              <Text
                style={{ color: colors.textSecondary }}
                className="text-base text-center font-medium">
                No posts yet
              </Text>
              <Text
                style={{ color: colors.textSecondary }}
                className="text-sm text-center mt-1">
                Create your first post to get started!
              </Text>
            </View>
          ) : (
            <View className="px-4">
              {posts.map((post) => (
                <View key={post.id} className="mb-4">
                  {renderPost({ item: post })}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet">
        <SafeAreaView
          style={{ backgroundColor: colors.background }}
          className="flex-1">
          <View
            style={{
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            }}
            className="px-4 py-3 border-b flex-row items-center justify-between">
            <Text
              style={{ color: colors.text }}
              className="text-lg font-semibold">
              Edit Profile
            </Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ backgroundColor: colors.background }}
            className="flex-1 p-4">
            <View className="space-y-4">
              <View>
                <Text
                  style={{ color: colors.text }}
                  className="font-medium mb-2">
                  Username
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                  className="border rounded-lg px-4 py-3"
                  value={editForm.username}
                  onChangeText={(text) =>
                    setEditForm((prev) => ({ ...prev, username: text }))
                  }
                  placeholder="Enter username"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View>
                <Text
                  style={{ color: colors.text }}
                  className="font-medium mb-2">
                  Full Name
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                  className="border rounded-lg px-4 py-3"
                  value={editForm.full_name}
                  onChangeText={(text) =>
                    setEditForm((prev) => ({ ...prev, full_name: text }))
                  }
                  placeholder="Enter full name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View>
                <Text
                  style={{ color: colors.text }}
                  className="font-medium mb-2">
                  Bio
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                  className="border rounded-lg px-4 py-3"
                  value={editForm.bio}
                  onChangeText={(text) =>
                    setEditForm((prev) => ({ ...prev, bio: text }))
                  }
                  placeholder="Tell us about yourself"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                onPress={handleEditProfile}
                disabled={editing}
                style={{
                  backgroundColor: editing
                    ? colors.textSecondary
                    : colors.primary,
                }}
                className="py-3 rounded-lg">
                <Text className="text-white text-center font-semibold">
                  {editing ? "Saving..." : "Save Changes"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Friends Modal */}
      <Modal
        visible={friendsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet">
        <SafeAreaView style={{ backgroundColor: colors.background }} className="flex-1">
          <View style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }} className="px-4 py-4 border-b flex-row items-center justify-between">
            <Text style={{ color: colors.text }} className="text-lg font-semibold">
              Friends ({friends.length})
            </Text>
            <TouchableOpacity onPress={() => setFriendsModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}
                className="flex-row items-center p-4 border-b"
                onPress={() => router.push(`/user-profile/${item.id}`)}>
                <View className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mr-3 flex items-center justify-center">
                  <Text className="text-white font-bold">
                    {item.username?.charAt(0).toUpperCase() || "U"}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.text }} className="font-semibold">
                    {item.full_name || "No Name Set"}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>@{item.username}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-16">
                <View style={{ backgroundColor: colors.border }} className="w-16 h-16 rounded-full items-center justify-center mb-4">
                  <Ionicons name="people-outline" size={32} color={colors.textSecondary} />
                </View>
                <Text style={{ color: colors.textSecondary }} className="text-base text-center font-medium">
                  No friends yet
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm text-center mt-1">
                  Start adding friends to see them here!
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Pending Requests Modal */}
      <Modal
        visible={requestsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet">
        <SafeAreaView style={{ backgroundColor: colors.background }} className="flex-1">
          <View style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }} className="px-4 py-4 border-b flex-row items-center justify-between">
            <Text style={{ color: colors.text }} className="text-lg font-semibold">
              Friend Requests ({pendingRequests.length})
            </Text>
            <TouchableOpacity onPress={() => setRequestsModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={pendingRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }} className="flex-row items-center p-4 border-b">
                <View className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mr-3 flex items-center justify-center">
                  <Text className="text-white font-bold">
                    {item.username?.charAt(0).toUpperCase() || "U"}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.text }} className="font-semibold">
                    {item.full_name || "No Name Set"}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>@{item.username}</Text>
                </View>
                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    onPress={() =>
                      handleAcceptRequest(
                        item.id,
                        item.full_name || item.username
                      )
                    }
                    style={{ backgroundColor: colors.success }}
                    className="px-4 py-2 rounded-full">
                    <Text className="text-white text-sm font-medium">
                      Accept
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      handleRejectRequest(
                        item.id,
                        item.full_name || item.username
                      )
                    }
                    style={{ backgroundColor: colors.error }}
                    className="px-4 py-2 rounded-full">
                    <Text className="text-white text-sm font-medium">
                      Reject
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-16">
                <View style={{ backgroundColor: colors.border }} className="w-16 h-16 rounded-full items-center justify-center mb-4">
                  <Ionicons name="mail-outline" size={32} color={colors.textSecondary} />
                </View>
                <Text style={{ color: colors.textSecondary }} className="text-base text-center font-medium">
                  No pending requests
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm text-center mt-1">
                  You are all caught up!
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
