import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import {
  cancelFriendRequest,
  getCurrentUserProfile,
  getFriendCount,
  getFriendRequestStatus,
  getFriends,
  getUserPosts,
  likePost,
  sendFriendRequest,
  supabase,
  unfriendUser,
  unlikePost
} from '../../lib/supabase';

const { width } = Dimensions.get('window');

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface Post {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles?: UserProfile;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
}

export default function UserProfileScreen() {
  const { colors } = useTheme();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [friendStatus, setFriendStatus] = useState<string>('none');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  useEffect(() => {
    if (userId) {
      loadProfileData();
    }
  }, [userId]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadUserProfile(),
        loadCurrentUser(),
        loadUserPosts(),
        loadFriends(),
        loadFriendCount(),
        loadFriendStatus()
      ]);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        Alert.alert('Error', 'Failed to load user profile');
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const { data, error } = await getCurrentUserProfile();
      if (error) {
        console.error('Error loading current user:', error);
      } else {
        setCurrentUser(data);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadUserPosts = async () => {
    try {
      const { data, error } = await getUserPosts(userId!);
      if (error) {
        console.error('Error loading user posts:', error);
      } else {
        setPosts(data || []);
      }
    } catch (error) {
      console.error('Error in loadUserPosts:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const { data, error } = await getFriends(userId!);
      if (error) {
        console.error('Error loading friends:', error);
      } else {
        setFriends(data || []);
      }
    } catch (error) {
      console.error('Error in loadFriends:', error);
    }
  };

  const loadFriendCount = async () => {
    try {
      const { count, error } = await getFriendCount(userId!);
      if (error) {
        console.error('Error loading friend count:', error);
      } else {
        setFriendCount(count);
      }
    } catch (error) {
      console.error('Error in loadFriendCount:', error);
    }
  };

  const loadFriendStatus = async () => {
    try {
      const { data, error } = await getFriendRequestStatus(userId!);
      if (error) {
        console.error('Error loading friend status:', error);
      } else {
        setFriendStatus(data);
      }
    } catch (error) {
      console.error('Error in loadFriendStatus:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  const handleFriendAction = async () => {
    if (!userId || actionLoading) return;

    setActionLoading(true);
    try {
      switch (friendStatus) {
        case 'none':
          const { error: sendError } = await sendFriendRequest(userId);
          if (sendError) {
            Alert.alert('Error', 'Failed to send friend request');
          } else {
            setFriendStatus('pending');
            Alert.alert('Success', 'Friend request sent!');
          }
          break;

        case 'pending':
          const { error: cancelError } = await cancelFriendRequest(userId);
          if (cancelError) {
            Alert.alert('Error', 'Failed to cancel friend request');
          } else {
            setFriendStatus('none');
            Alert.alert('Success', 'Friend request cancelled');
          }
          break;

        case 'accepted':
          Alert.alert(
            'Unfriend',
            `Are you sure you want to unfriend ${profile?.full_name || profile?.username}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Unfriend',
                style: 'destructive',
                onPress: async () => {
                  const { error: unfriendError } = await unfriendUser(userId);
                  if (unfriendError) {
                    Alert.alert('Error', 'Failed to unfriend user');
                  } else {
                    setFriendStatus('none');
                    await loadFriendCount();
                    await loadFriends();
                    Alert.alert('Success', 'User unfriended');
                  }
                }
              }
            ]
          );
          break;
      }
    } catch (error) {
      console.error('Error in friend action:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLikePost = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
      
      // Update post in local state
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                is_liked: !isLiked,
                like_count: isLiked ? post.like_count - 1 : post.like_count + 1
              }
            : post
        )
      );
    } catch (error) {
      console.error('Error liking/unliking post:', error);
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const renderFriendButton = () => {
    if (currentUser?.id === userId) {
      return (
        <TouchableOpacity
          style={{ backgroundColor: colors.border }}
          className="flex-1 py-3 rounded-xl mr-2"
          onPress={() => router.push('/profile')}
        >
          <Text style={{ color: colors.text }} className="text-center font-semibold">
            Edit Profile
          </Text>
        </TouchableOpacity>
      );
    }

    let buttonText = 'Add Friend';
    let buttonColor = colors.primary;
    let textColor = 'white';

    switch (friendStatus) {
      case 'pending':
        buttonText = 'Cancel Request';
        buttonColor = colors.border;
        textColor = colors.text;
        break;
      case 'accepted':
        buttonText = 'Friends';
        buttonColor = colors.surface;
        textColor = colors.text;
        break;
    }

    return (
      <TouchableOpacity
        style={{ backgroundColor: buttonColor }}
        className="flex-1 py-3 rounded-xl mr-2"
        onPress={handleFriendAction}
        disabled={actionLoading}
      >
        <Text style={{ color: textColor }} className="text-center font-semibold">
          {actionLoading ? 'Loading...' : buttonText}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={{ backgroundColor: colors.surface }} className="mb-4 rounded-2xl shadow-sm">
      {/* Post Header */}
      <View className="flex-row items-center p-4 pb-3">
        <View className="w-10 h-10 bg-blue-500 rounded-full mr-3 flex items-center justify-center">
          <Text className="text-white font-bold">
            {profile?.username?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View className="flex-1">
          <Text style={{ color: colors.text }} className="font-semibold">
            {profile?.full_name || profile?.username}
          </Text>
          <Text style={{ color: colors.textSecondary }} className="text-xs">
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Post Content */}
      <View className="px-4 pb-3">
        <Text style={{ color: colors.text }} className="text-base leading-5">
          {item.content}
        </Text>
      </View>

      {/* Post Image */}
      {item.image_url && (
        <Image
          source={{ uri: item.image_url }}
          style={{ width: '100%', height: 200 }}
          className="bg-gray-200"
          resizeMode="cover"
        />
      )}

      {/* Post Actions */}
      <View className="flex-row items-center justify-between px-4 py-3 border-t border-gray-100">
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => handleLikePost(item.id, item.is_liked)}
        >
          <Ionicons
            name={item.is_liked ? "heart" : "heart-outline"}
            size={20}
            color={item.is_liked ? "#ef4444" : colors.textSecondary}
            className="mr-1"
          />
          <Text style={{ color: colors.textSecondary }} className="text-sm ml-1">
            {item.like_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center">
          <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary }} className="text-sm ml-1">
            {item.comment_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFriend = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity
      className="items-center mr-4"
      onPress={() => router.push(`/user-profile/${item.id}`)}
    >
      <View className="w-16 h-16 bg-blue-500 rounded-full items-center justify-center mb-2">
        <Text className="text-white font-bold text-lg">
          {item.username?.charAt(0).toUpperCase() || 'U'}
        </Text>
      </View>
      <Text style={{ color: colors.text }} className="text-xs text-center font-medium" numberOfLines={1}>
        {item.full_name || item.username}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ backgroundColor: colors.background }} className="flex-1">
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: colors.textSecondary }} className="text-base">
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ backgroundColor: colors.background }} className="flex-1">
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: colors.textSecondary }} className="text-base">
            Profile not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 px-6 py-2 rounded-full"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: colors.background }} className="flex-1">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile Header */}
        <View className="px-4 py-6">
          {/* Avatar and Stats */}
          <View className="flex-row items-center mb-4">
            <View className="w-20 h-20 bg-blue-500 rounded-full items-center justify-center mr-4">
              <Text className="text-white font-bold text-2xl">
                {profile.username?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            
            <View className="flex-1 flex-row justify-around">
              <View className="items-center">
                <Text style={{ color: colors.text }} className="text-xl font-bold">
                  {posts.length}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">
                  Posts
                </Text>
              </View>
              
              <TouchableOpacity 
                className="items-center"
                onPress={() => setShowFriendsModal(true)}
              >
                <Text style={{ color: colors.text }} className="text-xl font-bold">
                  {friendCount}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm">
                  Friends
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Name and Bio */}
          <View className="mb-4">
            <Text style={{ color: colors.text }} className="text-lg font-bold mb-1">
              {profile.full_name || profile.username}
            </Text>
            {profile.bio && (
              <Text style={{ color: colors.text }} className="text-sm leading-5">
                {profile.bio}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View className="flex-row">
            {renderFriendButton()}
            <TouchableOpacity
              style={{ backgroundColor: colors.border }}
              className="px-6 py-3 rounded-xl"
            >
              <Text style={{ color: colors.text }} className="font-semibold">
                Message
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Friends Preview */}
        {friends.length > 0 && (
          <View className="mb-4">
            <View className="flex-row items-center justify-between px-4 mb-3">
              <Text style={{ color: colors.text }} className="text-lg font-semibold">
                Friends
              </Text>
              <TouchableOpacity onPress={() => setShowFriendsModal(true)}>
                <Text style={{ color: colors.primary }} className="text-sm font-medium">
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={friends.slice(0, 6)}
              keyExtractor={(item) => item.id}
              renderItem={renderFriend}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
          </View>
        )}

        {/* Posts */}
        <View className="px-4">
          <Text style={{ color: colors.text }} className="text-lg font-semibold mb-4">
            Posts
          </Text>
          {posts.length > 0 ? (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={renderPost}
              scrollEnabled={false}
            />
          ) : (
            <View className="items-center py-12">
              <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary }} className="text-center mt-4">
                No posts yet
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Friends Modal */}
      <Modal
        visible={showFriendsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ backgroundColor: colors.background }} className="flex-1">
          <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border }}>
            <Text style={{ color: colors.text }} className="text-lg font-semibold">
              Friends ({friendCount})
            </Text>
            <TouchableOpacity onPress={() => setShowFriendsModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            className="flex-1"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{ backgroundColor: colors.surface }}
                className="flex-row items-center p-4 mb-2 mx-4 rounded-xl"
                onPress={() => {
                  setShowFriendsModal(false);
                  router.push(`/user-profile/${item.id}`);
                }}
              >
                <View className="w-12 h-12 bg-blue-500 rounded-full mr-3 flex items-center justify-center">
                  <Text className="text-white font-bold text-lg">
                    {item.username?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.text }} className="font-semibold text-base">
                    {item.full_name || item.username}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm">
                    @{item.username}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}