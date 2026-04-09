/**
 * PART:   Root Layout — providers + auth init + font loading
 * ACTOR:  Claude Sonnet 4.6 + Gemini 3.1
 * PHASE:  1 — Project Setup / Phase 2 — Navigation
 * TASK:   Wrap app with QueryClientProvider, init APIClient, load custom fonts
 * SCOPE:  IN: provider setup, APIClient init, auth redirect, font loading
 *         OUT: screen UI (each screen handles that)
 */

import { useEffect, useCallback, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '@/hooks/useTheme';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { DemoDataSeeder } from '@/services/demo/DemoDataSeeder';
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
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Seed demo data for hackathon (IS_HACKATHON=true)
        DemoDataSeeder.activate();
        // Fonts: using system fonts for hackathon (Inter/SpaceGrotesk not bundled yet)
        // Phase 24: add proper font asset files and load them here
        await SplashScreen.hideAsync();
      } catch (e) {
        // Ignore
      } finally {
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  if (!appReady) return null;

  return (
    <ThemeProvider>
      <ErrorBoundary screenName="Root">
        <View style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <AuthGuard />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
              <Stack.Screen name="patch-connect" options={{ presentation: 'modal' }} />
            </Stack>
          </QueryClientProvider>
        </View>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

