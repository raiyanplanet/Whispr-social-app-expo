import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Image,
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
import { signIn, signUp, supabase } from "../lib/supabase";

export default function AuthScreen() {
  const { colors } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const checkEmailExists = async (email: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();
    
    return { exists: !!data, error };
  };

  const checkUsernameExists = async (username: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();
    
    return { exists: !!data, error };
  };

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
        // Check if email already exists
        const emailCheck = await checkEmailExists(email);
        if (emailCheck.exists) {
          Alert.alert("Error", "An account with this email already exists. Please sign in instead.");
          setLoading(false);
          return;
        }

        // Check if username already exists
        const usernameCheck = await checkUsernameExists(username);
        if (usernameCheck.exists) {
          Alert.alert("Error", "This username is already taken. Please choose a different username.");
          setLoading(false);
          return;
        }

        const { error: _error } = await signUp(email, password, username);
        if (_error) {
          Alert.alert("Error", _error.message);
        } else {
          Alert.alert("Success", "Account created! Please check your email to verify your account.");
          setIsLogin(true);
        }
      }
    } catch (_error) {
      Alert.alert("Error", "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: colors.background }} className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ 
            flexGrow: 1,
            paddingBottom: 100 // Add extra padding at bottom
          }}
          style={{ backgroundColor: colors.background }}
          className="px-6 py-8"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center">
            {/* Header */}
            <View className="items-center mb-12">
              <View className="w-20 h-20 bg-blue-500 rounded-full items-center justify-center mb-4">
                <Image source={require("../assets/images/logo.png")} className="w-full h-full" />
              </View>
              <Text  className="text-3xl font-bold mb-2 text-blue-400">
                Whispr
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
                      color: colors.text,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      fontSize: 16
                    }}
                    placeholder="Enter your username"
                    placeholderTextColor={colors.textSecondary}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
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
                    color: colors.text,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    fontSize: 16
                  }}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View>
                <Text style={{ color: colors.text }} className="mb-2 font-medium">
                  Password
                </Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={{ 
                      backgroundColor: colors.surface, 
                      borderColor: colors.border, 
                      color: colors.text,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      paddingRight: 50, // Extra padding for the icon
                      borderRadius: 8,
                      borderWidth: 1,
                      fontSize: 16
                    }}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleAuth}
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 16,
                      top: 12,
                      padding: 4
                    }}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
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