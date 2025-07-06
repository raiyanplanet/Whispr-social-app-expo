import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import {
  addComment,
  checkIfUserLiked,
  createPost,
  deletePost,
  getCurrentUserProfile,
  getPostCommentCount,
  getPostComments,
  getPostLikes,
  getPosts,
  getUsersWhoLiked,
  likePost,
  searchUsers,
  unlikePost,
} from "../../lib/supabase";

interface Post {
  id: string;
  content: string;
  image_url?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  } | null;
  likes_count?: number;
  is_liked?: boolean;
  comments_count?: number;
}

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  post_id: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  } | null;
}

interface SearchUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

export default function FeedScreen() {
  const { colors } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commenting, setCommenting] = useState(false);
  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [usersWhoLiked, setUsersWhoLiked] = useState<
    {
      id: string;
      username: string;
      full_name: string;
      avatar_url?: string;
    }[]
  >([]);

  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // New posts tracking
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [lastPostId, setLastPostId] = useState<string | null>(null);
  const [checkingNewPosts, setCheckingNewPosts] = useState(false);

  useEffect(() => {
    loadPosts();
    loadCurrentUser();
  }, []);

  const checkForNewPosts = useCallback(async () => {
    if (!lastPostId || checkingNewPosts) return;

    try {
      setCheckingNewPosts(true);
      const { data, error } = await getPosts();

      if (error) {
        console.error("Error checking for new posts:", error);
        return;
      }

      if (data && data.length > 0) {
        // Find how many posts are newer than our last known post
        const lastPostIndex = data.findIndex((post) => post.id === lastPostId);
        if (lastPostIndex > 0) {
          setNewPostsCount(lastPostIndex);
        } else if (lastPostIndex === -1 && data.length > 0) {
          // If our last post is not found, all posts are new
          setNewPostsCount(data.length);
        }
      }
    } catch (error) {
      console.error("Error checking for new posts:", error);
    } finally {
      setCheckingNewPosts(false);
    }
  }, [lastPostId, checkingNewPosts]);

  // Refresh posts when screen comes into focus (e.g., when returning from profile)
  useFocusEffect(
    useCallback(() => {
      checkForNewPosts();
    }, [checkForNewPosts])
  );

  const loadCurrentUser = async () => {
    try {
      const { data, error } = await getCurrentUserProfile();
      if (error) {
        console.error("Error loading current user:", error);
      } else {
        setCurrentUser(data);
      }
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await getPosts();

      if (error) {
        console.error("Error loading posts:", error);
        Alert.alert("Error", "Failed to load posts");
      } else {
        // Limit to 30 posts
        const limitedPosts = (data || []).slice(0, 30);

        // Load likes and comments data for each post
        const postsWithData = await Promise.all(
          limitedPosts.map(async (post) => {
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

        setPosts(postsWithData);

        // Set the last post ID for tracking new posts
        if (postsWithData.length > 0) {
          setLastPostId(postsWithData[0].id);
        }

        // Reset new posts count when loading fresh posts
        setNewPostsCount(0);
      }
    } catch (error) {
      console.error("Error in loadPosts:", error);
      Alert.alert("Error", "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    await loadCurrentUser();
    setRefreshing(false);
  };

  const handleNewPostsClick = async () => {
    setNewPostsCount(0);
    await loadPosts();
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await searchUsers(query.trim());

      if (error) {
        console.error("Error searching users:", error);
      } else {
        setSearchResults(data || []);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error("Error in search:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      Alert.alert("Error", "Please enter some content for your post");
      return;
    }

    try {
      setPosting(true);
      const { error } = await createPost(newPostContent.trim());

      if (error) {
        console.error("Error creating post:", error);
        Alert.alert("Error", "Failed to create post");
      } else {
        setNewPostContent("");
        // Check for new posts after creating a post
        setTimeout(() => {
          checkForNewPosts();
        }, 1000); // Small delay to ensure the post is processed
        Alert.alert("Success", "Post created successfully!");
      }
    } catch (error) {
      console.error("Error in handleCreatePost:", error);
      Alert.alert("Error", "Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      if (post.is_liked) {
        const { error } = await unlikePost(postId);
        if (!error) {
          setPosts((prevPosts) =>
            prevPosts.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    is_liked: false,
                    likes_count: (p.likes_count || 1) - 1,
                  }
                : p
            )
          );
        }
      } else {
        const { error } = await likePost(postId);
        if (!error) {
          setPosts((prevPosts) =>
            prevPosts.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    is_liked: true,
                    likes_count: (p.likes_count || 0) + 1,
                  }
                : p
            )
          );
        }
      }
    } catch (error) {
      console.error("Error handling like:", error);
      Alert.alert("Error", "Failed to update like");
    }
  };

  const handleComment = async (post: Post) => {
    setSelectedPost(post);
    setCommentModalVisible(true);
    setCommentText("");

    // Load existing comments
    try {
      const { data, error } = await getPostComments(post.id);
      if (!error && data) {
        setComments(data);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleShowLikes = async (post: Post) => {
    try {
      const { data, error } = await getUsersWhoLiked(post.id);
      if (error) {
        console.error("Error loading users who liked:", error);
        Alert.alert("Error", "Failed to load likes");
      } else {
        setUsersWhoLiked(data || []);
        setLikesModalVisible(true);
      }
    } catch (error) {
      console.error("Error loading users who liked:", error);
      Alert.alert("Error", "Failed to load likes");
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || !selectedPost) return;

    try {
      setCommenting(true);
      const { error } = await addComment(selectedPost.id, commentText.trim());

      if (error) {
        Alert.alert("Error", "Failed to add comment");
      } else {
        setCommentText("");
        // Reload comments
        const [commentsData, commentCountData] = await Promise.all([
          getPostComments(selectedPost.id),
          getPostCommentCount(selectedPost.id),
        ]);

        if (commentsData.data) {
          setComments(commentsData.data);
        }

        // Update the post's comment count in the feed
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === selectedPost.id
              ? { ...p, comments_count: commentCountData.count || 0 }
              : p
          )
        );
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setCommenting(false);
    }
  };

  const handleShare = (post: Post) => {
    Alert.alert("Share", "Share functionality coming soon!");
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await deletePost(postId);
              if (error) {
                Alert.alert("Error", "Failed to delete post");
              } else {
                // Remove the post from the local state
                setPosts((prevPosts) =>
                  prevPosts.filter((p) => p.id !== postId)
                );
                Alert.alert("Success", "Post deleted successfully");
              }
            } catch (error) {
              console.error("Error deleting post:", error);
              Alert.alert("Error", "Failed to delete post");
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View
      style={{ backgroundColor: colors.surface }}
      className="mb-6 mx-4 rounded-2xl shadow-sm overflow-hidden">
      {/* Post Header */}
      <View className="flex-row items-center justify-between p-4">
        <TouchableOpacity
          className="flex-row items-center flex-1"
          onPress={() => router.push(`/user-profile/${item.user_id}`)}>
          <View className="w-12 h-12 bg-blue-500 rounded-full mr-3 flex items-center justify-center shadow-sm">
            <Text className="text-white font-bold text-lg">
              {item.profiles?.username?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <View className="flex-1">
            <Text
              style={{ color: colors.text }}
              className="font-semibold text-base">
              {item.profiles?.full_name ||
                item.profiles?.username ||
                "Unknown User"}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm">
              {formatDate(item.created_at)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Delete button for current user's posts */}
        {currentUser && item.user_id === currentUser.id && (
          <TouchableOpacity
            onPress={() => handleDeletePost(item.id)}
            className="p-2 rounded-full"
            style={{ backgroundColor: colors.border }}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Post Content */}
      <View className="px-4 pb-4 border-b mb-2 border-gray-400">
        <Text style={{ color: colors.text }} className="text-base leading-6">
          {item.content}
        </Text>
      </View>

      {/* Post Actions */}
      <View className="flex-row items-center justify-between px-4 pb-4">
        <TouchableOpacity
          className="flex-row items-center flex-1 justify-center py-2 rounded-xl"
          onPress={() => handleLike(item.id)}
          style={{
            backgroundColor: item.is_liked
              ? "rgba(239, 68, 68, 0.1)"
              : "transparent",
          }}>
          <Ionicons
            name={item.is_liked ? "heart" : "heart-outline"}
            size={20}
            color={item.is_liked ? colors.error : colors.textSecondary}
          />
          <TouchableOpacity
            onPress={() => handleShowLikes(item)}
            disabled={!item.likes_count || item.likes_count === 0}
            className="ml-1">
            <Text
              style={{
                color: item.is_liked ? colors.error : colors.textSecondary,
              }}
              className="font-medium">
              {item.likes_count || 0}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center flex-1 justify-center py-2 rounded-xl"
          onPress={() => handleComment(item)}
          style={{ backgroundColor: "transparent" }}>
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={colors.textSecondary}
          />
          <Text
            style={{ color: colors.textSecondary }}
            className="ml-1 font-medium">
            {item.comments_count || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center flex-1 justify-center py-2 rounded-xl"
          onPress={() => handleShare(item)}
          style={{ backgroundColor: "transparent" }}>
          <Ionicons
            name="share-outline"
            size={20}
            color={colors.textSecondary}
          />
          <Text
            style={{ color: colors.textSecondary }}
            className="ml-1 font-medium">
            Share
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={{ backgroundColor: colors.background }}
      className="flex-1">
      {/* Header with Search */}
      <View
        style={{ backgroundColor: colors.surface }}
        className="px-4 py-4 mb-3">
        <View className="flex flex-row justify-between items-center gap-2">
          <Text
            style={{ color: colors.text }}
            className="text-2xl font-bold mb-2">
            Feed
          </Text>

          {/* Search Bar */}
          <View
            style={{ backgroundColor: colors.background }}
            className="flex-row w-4/5 items-center rounded-2xl px-4 py-1 shadow-sm">
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={{ color: colors.text }}
              className="flex-1 ml-3 text-base"
              placeholder="Search people..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => setShowSearchResults(true)}
            />
            {searching && (
              <Ionicons name="reload" size={20} color={colors.textSecondary} />
            )}
          </View>
        </View>

        {/* Search Results */}
        {showSearchResults && searchResults.length > 0 && (
          <View
            style={{ backgroundColor: colors.surface }}
            className="mt-2 rounded-2xl shadow-sm overflow-hidden">
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="flex-row items-center p-4"
                  onPress={() => {
                    router.push(`/user-profile/${item.id}`);
                    setShowSearchResults(false);
                    setSearchQuery("");
                  }}>
                  <View className="w-10 h-10 bg-blue-500 rounded-full mr-3 flex items-center justify-center">
                    <Text className="text-white font-bold text-sm">
                      {item.username?.charAt(0).toUpperCase() || "U"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{ color: colors.text }}
                      className="font-semibold">
                      {item.full_name || "No Name Set"}
                    </Text>
                    <Text
                      style={{ color: colors.textSecondary }}
                      className="text-sm">
                      @{item.username}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Create Post Section */}
      <View
        style={{ backgroundColor: colors.surface }}
        className="mx-4 mb-3 p-4 rounded-2xl shadow-sm">
        <View className="flex-row items-start">
          <View className="w-12 h-12 bg-blue-500 rounded-full mr-3 flex items-center justify-center shadow-sm">
            <Text className="text-white font-bold text-lg">
              {currentUser?.username?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <View className="flex-1">
            <TextInput
              style={{
                backgroundColor: colors.background,
                color: colors.text,
              }}
              className="rounded-2xl px-4 py-3 text-base min-h-[50px]"
              placeholder="What's on your mind?"
              placeholderTextColor={colors.textSecondary}
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
              textAlignVertical="center"
            />
            <View className="flex-row justify-between items-center mt-3">
              <View className="flex-row space-x-4">
                <TouchableOpacity className="flex-row items-center">
                  <Ionicons name="image" size={20} color={colors.primary} />
                  <Text
                    style={{ color: colors.primary }}
                    className="ml-1 font-medium">
                    Photo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center">
                  <Ionicons name="camera" size={20} color={colors.success} />
                  <Text
                    style={{ color: colors.success }}
                    className="ml-1 font-medium">
                    Camera
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor:
                    posting || !newPostContent.trim()
                      ? colors.textSecondary
                      : colors.primary,
                  opacity: posting || !newPostContent.trim() ? 0.5 : 1,
                }}
                className="py-2 px-6 rounded-full"
                onPress={handleCreatePost}
                disabled={posting || !newPostContent.trim()}>
                <Text className="text-white font-semibold">
                  {posting ? "Posting..." : "Post"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* New Posts Indicator - Fixed Position */}
      {newPostsCount > 0 && (
        <View className="px-4 mb-4">
          <TouchableOpacity
            onPress={handleNewPostsClick}
            style={{ backgroundColor: colors.primary }}
            className="py-3 px-4 rounded-2xl flex-row items-center justify-center shadow-sm">
            <Ionicons name="refresh" size={16} color="white" />
            <Text className="text-white font-semibold ml-2">
              {newPostsCount} new post{newPostsCount !== 1 ? "s" : ""}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Posts List */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <View
              style={{ backgroundColor: colors.border }}
              className="w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons
                name="newspaper-outline"
                size={40}
                color={colors.textSecondary}
              />
            </View>
            <Text
              style={{ color: colors.textSecondary }}
              className="text-lg mt-4 text-center font-medium">
              {loading
                ? "Loading posts..."
                : "No posts from friends yet. Add some friends to see their posts!"}
            </Text>
            {!loading && (
              <TouchableOpacity
                style={{ backgroundColor: colors.primary }}
                className="mt-6 px-8 py-3 rounded-full"
                onPress={() => router.push("/search")}>
                <Text className="text-white font-semibold">Find Friends</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Comment Modal */}
      <Modal
        visible={commentModalVisible}
        animationType="slide"
        presentationStyle="pageSheet">
        <SafeAreaView
          style={{ backgroundColor: colors.background }}
          className="flex-1">
          <View
            style={{ backgroundColor: colors.surface }}
            className="flex-row items-center justify-between p-4">
            <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text
              style={{ color: colors.text }}
              className="text-lg font-semibold">
              Comments
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            data={comments}
            className="flex-1 px-4"
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="py-4">
                <View className="flex-row items-start">
                  <View className="w-10 h-10 bg-blue-500 rounded-full mr-3 flex items-center justify-center">
                    <Text className="text-white font-bold text-sm">
                      {item.profiles?.username?.charAt(0).toUpperCase() || "U"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{ color: colors.text }}
                      className="font-semibold">
                      {item.profiles?.full_name ||
                        item.profiles?.username ||
                        "Unknown User"}
                    </Text>
                    <Text style={{ color: colors.text }} className="mt-1">
                      {item.content}
                    </Text>
                    <Text
                      style={{ color: colors.textSecondary }}
                      className="text-xs mt-2">
                      {formatDate(item.created_at)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <View
                  style={{ backgroundColor: colors.border }}
                  className="w-16 h-16 rounded-full items-center justify-center mb-4">
                  <Ionicons
                    name="chatbubble-outline"
                    size={32}
                    color={colors.textSecondary}
                  />
                </View>
                <Text style={{ color: colors.textSecondary }}>
                  No comments yet
                </Text>
              </View>
            }
          />

          <View style={{ backgroundColor: colors.surface }} className="p-4">
            <View className="flex-row items-center">
              <TextInput
                style={{
                  backgroundColor: colors.background,
                  color: colors.text,
                }}
                className="flex-1 rounded-full px-4 py-3 mr-3"
                placeholder="Write a comment..."
                placeholderTextColor={colors.textSecondary}
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                onPress={submitComment}
                disabled={commenting || !commentText.trim()}
                style={{
                  backgroundColor:
                    commenting || !commentText.trim()
                      ? colors.textSecondary
                      : colors.primary,
                  opacity: commenting || !commentText.trim() ? 0.5 : 1,
                }}
                className="px-6 py-3 rounded-full">
                <Text className="text-white font-semibold">
                  {commenting ? "..." : "Post"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Likes Modal */}
      <Modal
        visible={likesModalVisible}
        animationType="slide"
        presentationStyle="pageSheet">
        <SafeAreaView
          style={{ backgroundColor: colors.background }}
          className="flex-1">
          <View
            style={{ backgroundColor: colors.surface }}
            className="flex-row items-center justify-between p-4">
            <TouchableOpacity onPress={() => setLikesModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text
              style={{ color: colors.text }}
              className="text-lg font-semibold">
              Likes ({usersWhoLiked.length})
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            data={usersWhoLiked}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="flex-row items-center p-4"
                onPress={() => {
                  router.push(`/user-profile/${item.id}`);
                  setLikesModalVisible(false);
                }}>
                <View className="w-12 h-12 bg-blue-500 rounded-full mr-3 flex items-center justify-center">
                  <Text className="text-white font-bold text-lg">
                    {item.username?.charAt(0).toUpperCase() || "U"}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    style={{ color: colors.text }}
                    className="font-semibold">
                    {item.full_name || "No Name Set"}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>
                    @{item.username}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center p-8">
                <Ionicons
                  name="heart-outline"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-lg mt-4 text-center">
                  No likes yet
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
