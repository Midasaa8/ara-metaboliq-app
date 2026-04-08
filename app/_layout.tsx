/**
 * PART:   Root Layout — providers + auth init + font loading
 * ACTOR:  Claude Sonnet 4.6 + Gemini 3.1
 * PHASE:  1 — Project Setup / Phase 2 — Navigation
 * TASK:   Wrap app with QueryClientProvider, init APIClient, load custom fonts
 * SCOPE:  IN: provider setup, APIClient init, auth redirect, font loading
 *         OUT: screen UI (each screen handles that)
 */

import { useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { initAPIClient } from '@/services/api/APIClient';
import { buildTokenStore, useSessionStore } from '@/store/sessionStore';
import '../global.css';

// Keep splash visible until fonts are loaded
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60_000,
    },
  },
});

initAPIClient(buildTokenStore());

function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const isLoggedIn = useSessionStore((s) => s.isLoggedIn);

  useEffect(() => {
    const inTabs = segments[0] === '(tabs)';
    if (!isLoggedIn && inTabs) {
      router.replace('/onboarding');
    }
  }, [isLoggedIn, segments]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = Font.useFonts({
    // Use system fonts that don't need asset files — avoids missing font crash
    // Real custom fonts can be added here when assets are available (Phase 24)
    'Inter-Regular': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    'Inter-Medium': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    'SpaceGrotesk-Bold': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null; // Hold render until fonts ready
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <QueryClientProvider client={queryClient}>
        <AuthGuard />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
          <Stack.Screen name="patch-connect" options={{ presentation: 'modal' }} />
        </Stack>
      </QueryClientProvider>
    </View>
  );
}

