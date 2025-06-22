import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createPost, getCurrentUserProfile } from "../../lib/supabase";

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export default function CreatePostScreen() {
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

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

  const handleImagePicker = () => {
    // TODO: Implement image picker with expo-image-picker
    Alert.alert(
      "Image Picker",
      "Image picker functionality will be implemented with expo-image-picker"
    );
  };

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert("Error", "Please write something to post");
      return;
    }

    setLoading(true);
    try {
      const { error } = await createPost(content, selectedImage || undefined);

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "Post created successfully!", [
          {
            text: "OK",
            onPress: () => {
              setContent("");
              setSelectedImage(null);
              router.back();
            },
          },
        ]);
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to create post" +
          (error instanceof Error ? `: ${error.message}` : "")
      );
    } finally {
      setLoading(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#6b7280" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          Create Post
        </Text>
        <TouchableOpacity
          onPress={handlePost}
          disabled={loading || !content.trim()}
          className={`px-4 py-2 rounded-full ${
            loading || !content.trim()
              ? "bg-gray-300 dark:bg-gray-600"
              : "bg-blue-500"
          }`}>
          <Text
            className={`font-semibold ${
              loading || !content.trim()
                ? "text-gray-500 dark:text-gray-400"
                : "text-white"
            }`}>
            {loading ? "Posting..." : "Post"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* User Info */}
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 bg-blue-500 rounded-full items-center justify-center mr-3">
            <Text className="text-white font-bold text-lg">
              {currentUser?.username?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <View>
            <Text className="font-semibold text-gray-900 dark:text-white">
              {currentUser?.full_name || "Your Name"}
            </Text>
            <Text className="text-gray-500 dark:text-gray-400 text-sm">
              @{currentUser?.username || "your_username"}
            </Text>
          </View>
        </View>

        {/* Content Input */}
        <TextInput
          className="text-gray-900 dark:text-white text-lg leading-6 min-h-[120px]"
          placeholder="What's on your mind?"
          placeholderTextColor="#6b7280"
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

        {/* Selected Image */}
        {selectedImage && (
          <View className="mt-4 relative">
            <Image
              source={{ uri: selectedImage }}
              className="w-full h-64 rounded-lg"
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={removeImage}
              className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-2">
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-row items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Text className="text-gray-600 dark:text-gray-400 font-medium">
            Add to your post
          </Text>
          <View className="flex-row space-x-4">
            <TouchableOpacity
              onPress={handleImagePicker}
              className="flex-row items-center">
              <Ionicons name="image" size={24} color="#3b82f6" />
              <Text className="ml-2 text-blue-500 font-medium">Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center">
              <Ionicons name="camera" size={24} color="#10b981" />
              <Text className="ml-2 text-green-500 font-medium">Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center">
              <Ionicons name="location" size={24} color="#ef4444" />
              <Text className="ml-2 text-red-500 font-medium">Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
