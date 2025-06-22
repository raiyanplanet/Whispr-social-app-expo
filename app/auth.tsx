import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { signIn, signUp } from "../lib/supabase";
import { testSupabaseConnection, testUserCreation as testUserCreationFunc } from "../lib/test-connection";

export default function AuthScreen() {
  const { colors } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !username)) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          Alert.alert("Error", error.message);
        } else {
          // Navigate to main app
          router.replace("/(tabs)");
        }
      } else {
        const { error } = await signUp(email, password, username);
        if (error) {
          Alert.alert("Error", error.message);
        } else {
          Alert.alert("Success", "Account created! Please check your email to verify your account.");
          setIsLogin(true);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    console.log('Testing connection...');
    const result = await testSupabaseConnection();
    console.log('Connection test result:', result);
    
    if (result.success) {
      Alert.alert("Success", "Database connection working!");
    } else {
      Alert.alert("Error", `Database issue: ${result.error}`);
    }
  };

  const testUserCreation = async () => {
    if (!email || !password || !username) {
      Alert.alert("Error", "Please fill in all fields first");
      return;
    }
    
    console.log('Testing user creation...');
    const result = await testUserCreationFunc(email, password, username);
    console.log('User creation test result:', result);
    
    if (result.success) {
      Alert.alert("Success", "User creation working!");
    } else {
      Alert.alert("Error", `User creation failed: ${result.error}`);
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: colors.background }} className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          style={{ backgroundColor: colors.background }}
          className="px-6 py-8"
        >
          <View className="flex-1 justify-center">
            {/* Header */}
            <View className="items-center mb-12">
              <View className="w-20 h-20 bg-blue-500 rounded-full items-center justify-center mb-4">
                <Ionicons name="people" size={40} color="white" />
              </View>
              <Text style={{ color: colors.text }} className="text-3xl font-bold mb-2">
                Social App
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center">
                {isLogin
                  ? "Welcome back! Sign in to your account"
                  : "Create your account to get started"}
              </Text>
            </View>

            {/* Form */}
            <View className="space-y-4">
              {!isLogin && (
                <View>
                  <Text style={{ color: colors.text }} className="mb-2 font-medium">
                    Username
                  </Text>
                  <TextInput
                    style={{ 
                      backgroundColor: colors.surface, 
                      borderColor: colors.border, 
                      color: colors.text 
                    }}
                    className="border rounded-lg px-4 py-3"
                    placeholder="Enter your username"
                    placeholderTextColor={colors.textSecondary}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
              )}

              <View>
                <Text style={{ color: colors.text }} className="mb-2 font-medium">
                  Email
                </Text>
                <TextInput
                  style={{ 
                    backgroundColor: colors.surface, 
                    borderColor: colors.border, 
                    color: colors.text 
                  }}
                  className="border rounded-lg px-4 py-3"
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View>
                <Text style={{ color: colors.text }} className="mb-2 font-medium">
                  Password
                </Text>
                <TextInput
                  style={{ 
                    backgroundColor: colors.surface, 
                    borderColor: colors.border, 
                    color: colors.text 
                  }}
                  className="border rounded-lg px-4 py-3"
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={{ 
                  backgroundColor: colors.primary,
                  opacity: loading ? 0.5 : 1
                }}
                className="rounded-lg py-4 mt-6"
                onPress={handleAuth}
                disabled={loading}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  {loading
                    ? "Loading..."
                    : isLogin
                    ? "Sign In"
                    : "Create Account"}
                </Text>
              </TouchableOpacity>

              {/* Debug Buttons */}
              <View className="mt-4 space-y-2">
                <TouchableOpacity
                  style={{ backgroundColor: colors.textSecondary }}
                  className="rounded-lg py-2"
                  onPress={testConnection}
                >
                  <Text className="text-white text-center">Test Database Connection</Text>
                </TouchableOpacity>
                
                {!isLogin && (
                  <TouchableOpacity
                    style={{ backgroundColor: colors.warning }}
                    className="rounded-lg py-2"
                    onPress={testUserCreation}
                  >
                    <Text className="text-white text-center">Test User Creation</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Toggle */}
            <View className="flex-row justify-center mt-8">
              <Text style={{ color: colors.textSecondary }}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                <Text style={{ color: colors.primary }} className="font-semibold">
                  {isLogin ? "Sign Up" : "Sign In"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 