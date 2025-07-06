import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import "../global.css";

function RootLayoutContent() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: "bold",
            color: colors.text,
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}>
        <Stack.Screen
          name="index"
          options={{
            title: "Social App",
          }}
        />
        <Stack.Screen
          name="auth"
          options={{
            title: "Authentication",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="debug"
          options={{
            title: "Debug",
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
