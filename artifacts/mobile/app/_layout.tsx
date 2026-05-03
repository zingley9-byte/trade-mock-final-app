import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TradingProvider } from "@/context/TradingContext";
import { AlertsProvider } from "@/context/AlertsContext";
import { AdminProvider } from "@/context/AdminContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const isNative = Platform.OS !== "web";

function AppProviders({ children }: { children: React.ReactNode }) {
  if (isNative) {
    const { KeyboardProvider } =
      require("react-native-keyboard-controller") as typeof import("react-native-keyboard-controller");
    return <KeyboardProvider>{children}</KeyboardProvider>;
  }
  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Explicitly require Ionicons TTF — spread (...Ionicons.font) is unreliable
    // on Android with new architecture; direct require always works.
    Ionicons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
    // App text fonts
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Always wait for fonts — never render with broken/missing font
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TradingProvider>
            <AlertsProvider>
              <AdminProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <AppProviders>
                    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
                      <Stack.Screen name="index" options={{ headerShown: false }} />
                      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                      <Stack.Screen name="auth" options={{ headerShown: false }} />
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="admin" options={{ headerShown: false }} />
                    </Stack>
                  </AppProviders>
                </GestureHandlerRootView>
              </AdminProvider>
            </AlertsProvider>
          </TradingProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
