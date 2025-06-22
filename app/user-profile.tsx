import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  getCurrentUserProfile,
  getFriendRequestStatus,
  getUserPosts,
  sendFriendRequest,
  supabase,
  unfriendUser
} from '../lib/supabase';

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
}

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [isSender, setIsSender] = useState(false);

  useEffect(() => {
    if (userId) {
      loadUserData();
      loadCurrentUser();
    }
  }, [userId]);

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

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get user profile
      const { data: userData, error: userError } = await getUserProfile(userId);
      if (userError) {
        console.error('Error loading user profile:', userError);
        Alert.alert('Error', 'Failed to load user profile');
        return;
      }
      
      if (userData) {
        setUser(userData);
        
        // Get friend request status
        const { data: status } = await getFriendRequestStatus(userId);
        setFriendStatus(status || 'none');
        
        // Check if current user is the sender of the request
        if (status === 'pending' && currentUser) {
          const { data: requestData } = await getFriendRequestDetails(userId);
          setIsSender(requestData?.sender_id === currentUser.id);
        }
        
        // Get user posts (only if friends or own profile)
        if (status === 'accepted' || userId === currentUser?.id) {
          const { data: postsData, error: postsError } = await getUserPosts(userId);
          if (postsError) {
            console.error('Error loading user posts:', postsError);
          } else {
            setPosts(postsData || []);
          }
        }
      }
    } catch (error) {
      console.error('Error in loadUserData:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const getUserProfile = async (targetUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      return { data, error };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { data: null, error: { message: 'Failed to get user profile' } };
    }
  };

  const getFriendRequestDetails = async (targetUserId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: null, error: null };

      const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id})`)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error: null };
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    await loadCurrentUser();
    setRefreshing(false);
  };

  const handleFriendRequest = async () => {
    if (!user) return;

    try {
      switch (friendStatus) {
        case 'none':
          // Send friend request
          const { error: sendError } = await sendFriendRequest(user.id);
          if (sendError) {
            Alert.alert('Error', 'Failed to send friend request');
            return;
          }
          setFriendStatus('pending');
          setIsSender(true);
          Alert.alert('Success', 'Friend request sent!');
          break;

        case 'pending':
          if (isSender) {
            // Cancel friend request
            const { error: cancelError } = await cancelFriendRequest(user.id);
            if (cancelError) {
              Alert.alert('Error', 'Failed to cancel friend request');
              return;
            }
            setFriendStatus('none');
            setIsSender(false);
            Alert.alert('Success', 'Friend request canceled');
          } else {
            // Accept friend request
            const { error: acceptError } = await acceptFriendRequest(user.id);
            if (acceptError) {
              Alert.alert('Error', 'Failed to accept friend request');
              return;
            }
            setFriendStatus('accepted');
            // Load posts after becoming friends
            const { data: postsData } = await getUserPosts(user.id);
            setPosts(postsData || []);
            Alert.alert('Success', 'Friend request accepted!');
          }
          break;

        case 'accepted':
          // Unfriend user
          Alert.alert(
            'Unfriend User',
            `Are you sure you want to unfriend ${user.full_name || user.username}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Unfriend',
                style: 'destructive',
                onPress: async () => {
                  const { error: unfriendError } = await unfriendUser(user.id);
                  if (unfriendError) {
                    Alert.alert('Error', 'Failed to unfriend user');
                    return;
                  }
                  setFriendStatus('none');
                  setPosts([]); // Hide posts after unfriending
                  Alert.alert('Success', 'User unfriended');
                }
              }
            ]
          );
          break;

        case 'rejected':
          // Send friend request again
          const { error: resendError } = await sendFriendRequest(user.id);
          if (resendError) {
            Alert.alert('Error', 'Failed to send friend request');
            return;
          }
          setFriendStatus('pending');
          setIsSender(true);
          Alert.alert('Success', 'Friend request sent!');
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error in handleFriendRequest:', error);
      Alert.alert('Error', 'Failed to update friend status');
    }
  };

  const getButtonText = () => {
    switch (friendStatus) {
      case 'none':
      case 'rejected':
        return 'Add Friend';
      case 'pending':
        return isSender ? 'Cancel Request' : 'Accept Request';
      case 'accepted':
        return 'Friends';
      default:
        return 'Add Friend';
    }
  };

  const getButtonStyle = () => {
    switch (friendStatus) {
      case 'none':
      case 'rejected':
        return 'bg-blue-500 shadow-sm';
      case 'pending':
        return isSender ? 'bg-gray-100' : 'bg-green-500 shadow-sm';
      case 'accepted':
        return 'bg-green-500 shadow-sm';
      default:
        return 'bg-blue-500 shadow-sm';
    }
  };

  const getButtonTextStyle = () => {
    switch (friendStatus) {
      case 'none':
      case 'rejected':
      case 'accepted':
        return 'text-white';
      case 'pending':
        return isSender ? 'text-gray-700' : 'text-white';
      default:
        return 'text-white';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const renderPost = ({ item }: { item: UserPost }) => (
    <View className="bg-white p-6 mb-3 mx-4 rounded-2xl shadow-sm">
      <View className="flex-row items-center mb-4">
        <View className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mr-4 flex items-center justify-center shadow-sm">
          <Text className="text-white font-bold text-lg">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-gray-900 text-base">
            {user?.full_name || 'No Name Set'}
          </Text>
          <Text className="text-gray-400 text-sm">
            {formatDate(item.created_at)}
          </Text>
        </View>
      </View>
      <Text className="text-gray-800 text-base leading-6 mb-4">{item.content}</Text>
      {item.image_url && (
        <View className="w-full h-48 bg-gray-100 rounded-xl mb-3 overflow-hidden">
          <View className="flex-1 items-center justify-center">
            <Ionicons name="image-outline" size={32} color="#9CA3AF" />
            <Text className="text-gray-400 text-sm mt-2">Image</Text>
          </View>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <View className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></View>
          <Text className="text-gray-500 text-lg">Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <Ionicons name="person-outline" size={64} color="#9CA3AF" />
          <Text className="text-gray-500 text-lg mt-4">User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-4 flex-row items-center shadow-sm">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-4"
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-semibold text-gray-900 flex-1">
          {user.full_name || user.username}
        </Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View className="bg-white p-6 mb-4 mx-4 rounded-2xl shadow-sm">
            {/* Profile Info */}
            <View className="flex-row items-center mb-6">
              <View className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mr-5 flex items-center justify-center shadow-lg">
                <Text className="text-white font-bold text-3xl">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-gray-900 mb-1">
                  {user.full_name || 'No Name Set'}
                </Text>
                <Text className="text-blue-500 font-medium mb-2">
                  @{user.username}
                </Text>
                {user.bio && (
                  <Text className="text-gray-600 text-base leading-5 mb-3">
                    {user.bio}
                  </Text>
                )}
                <Text className="text-gray-400 text-sm">
                  Joined {formatDate(user.created_at)}
                </Text>
              </View>
            </View>

            {/* Friend Request Button */}
            {currentUser && currentUser.id !== user.id && (
              <TouchableOpacity
                className={`px-8 py-4 rounded-2xl ${getButtonStyle()} mb-6`}
                onPress={handleFriendRequest}
              >
                <Text className={`font-semibold text-center text-base ${getButtonTextStyle()}`}>
                  {getButtonText()}
                </Text>
              </TouchableOpacity>
            )}

            {/* Posts Section */}
            <View className="pt-4">
              <Text className="text-xl font-bold text-gray-900 mb-3">
                Posts
              </Text>
              {friendStatus === 'accepted' || currentUser?.id === user.id ? (
                <Text className="text-gray-500 text-base">
                  {posts.length} post{posts.length !== 1 ? 's' : ''}
                </Text>
              ) : (
                <Text className="text-gray-500 text-base">
                  Add {user.full_name || user.username} as a friend to see their posts
                </Text>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          friendStatus === 'accepted' || currentUser?.id === user.id ? (
            <View className="flex-1 items-center justify-center py-12">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />
              </View>
              <Text className="text-gray-500 text-lg font-medium text-center">
                No posts yet
              </Text>
              <Text className="text-gray-400 text-base text-center mt-2">
                When {user.full_name || user.username} shares something, it will appear here
              </Text>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-12">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="lock-closed-outline" size={32} color="#9CA3AF" />
              </View>
              <Text className="text-gray-500 text-lg font-medium text-center">
                Posts are private
              </Text>
              <Text className="text-gray-400 text-base text-center mt-2">
                Add {user.full_name || user.username} as a friend to see their posts
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
} 