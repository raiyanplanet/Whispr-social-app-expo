import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { getPendingFriendRequests } from "../../lib/supabase";

export default function TabLayout() {
  const { colors } = useTheme();
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  useEffect(() => {
    loadPendingRequests();

    // Refresh every 30 seconds to check for new requests
    const interval = setInterval(loadPendingRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingRequests = async () => {
    try {
      const { data } = await getPendingFriendRequests();
      setPendingRequestCount(data?.length || 0);
    } catch (error) {
      console.error("Error loading pending requests:", error);
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Users",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
          tabBarBadge:
            pendingRequestCount > 0 ? pendingRequestCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.error,
            color: "#ffffff",
          },
        }}
      />
    </Tabs>
  );
}
