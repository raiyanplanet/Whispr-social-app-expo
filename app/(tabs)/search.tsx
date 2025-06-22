import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { getCurrentUserProfile, getFriends } from '../../lib/supabase';

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadFriends();
    loadCurrentUser();
  }, []);

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

  const loadFriends = async () => {
    try {
      setLoading(true);
      
      // First ensure we have the current user
      let userId = currentUser?.id;
      if (!userId) {
        const { data: userData, error: userError } = await getCurrentUserProfile();
        if (userError || !userData) {
          console.error('Error loading current user:', userError);
          setLoading(false);
          return;
        }
        setCurrentUser(userData);
        userId = userData.id;
      }

      // Ensure we have a valid user ID
      if (!userId || userId.trim() === '') {
        console.error('Invalid user ID');
        setLoading(false);
        return;
      }

      const { data, error } = await getFriends(userId);
      
      if (error) {
        console.error('Error loading friends:', error);
        Alert.alert('Error', 'Failed to load friends');
      } else {
        setFriends(data || []);
        setFilteredFriends(data || []);
      }
    } catch (error) {
      console.error('Error in loadFriends:', error);
      Alert.alert('Error', 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFriends();
    await loadCurrentUser();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredFriends(friends);
    } else {
      const filtered = friends.filter(
        (friend) =>
          friend.username.toLowerCase().includes(query.toLowerCase()) ||
          (friend.full_name && friend.full_name.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredFriends(filtered);
    }
  };

  const handleUserPress = (userId: string) => {
    router.push(`/user-profile?userId=${userId}`);
  };

  const renderFriend = ({ item }: { item: UserProfile }) => {
    return (
      <TouchableOpacity 
        style={{ backgroundColor: colors.surface }} 
        className="flex-row items-center p-4 mb-3 mx-4 rounded-2xl shadow-sm"
        onPress={() => handleUserPress(item.id)}
      >
        <View className="w-12 h-12 bg-blue-500 rounded-full mr-3 flex items-center justify-center shadow-sm">
          <Text className="text-white font-bold text-lg">{item.username?.charAt(0).toUpperCase() || 'U'}</Text>
        </View>
        <View className="flex-1">
          <Text style={{ color: colors.text }} className="font-semibold text-base">{item.full_name || item.username}</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm">@{item.username}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ backgroundColor: colors.background }} className="flex-1">
        <View className="flex-1 items-center justify-center">
          <View style={{ backgroundColor: colors.border }} className="w-16 h-16 rounded-full items-center justify-center mb-4">
            <Ionicons name="people-outline" size={32} color={colors.textSecondary} />
          </View>
          <Text style={{ color: colors.textSecondary }} className="text-base">Loading friends...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: colors.background }} className="flex-1">
      {/* Header */}
      <View className="px-4 py-4 mb-3">
        <View className="flex-row items-center justify-between mb-4">
          <Text style={{ color: colors.text }} className="text-2xl font-bold">My Friends</Text>
          <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-full" style={{ backgroundColor: colors.border }}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <View style={{ backgroundColor: colors.surface }} className="flex-row items-center rounded-2xl px-4 py-1 shadow-sm">
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={{ color: colors.text }}
            className="flex-1 ml-3 text-base"
            placeholder="Search your friends..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      {/* Friends List */}
      <FlatList
        data={filteredFriends}
        keyExtractor={(item) => item.id}
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderFriend}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <View style={{ backgroundColor: colors.border }} className="w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
            </View>
            <Text style={{ color: colors.textSecondary }} className="text-lg text-center font-medium">
              {searchQuery.trim() ? 'No friends found' : 'No friends yet'}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm text-center mt-2">
              {searchQuery.trim() ? 'Try adjusting your search terms' : 'Add some friends to see them here!'}
            </Text>
            {!searchQuery.trim() && (
              <TouchableOpacity 
                style={{ backgroundColor: colors.primary }}
                className="mt-6 px-8 py-3 rounded-full"
                onPress={() => router.push('/search')}
              >
                <Text className="text-white font-semibold">Find Friends</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
} 