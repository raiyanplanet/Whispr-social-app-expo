import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function Index() {
  const { user, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  // Redirect based on authentication state
  if (user) {
    // User is signed in, redirect to main app
    return <Redirect href="/(tabs)" />;
  } else {
    // User is not signed in, redirect to auth screen
    return <Redirect href="/auth" />;
  }
}
