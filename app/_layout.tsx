/**
 * PART:   Root Layout — providers + auth init
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  1 — Project Setup / Phase 2 — Navigation
 * TASK:   Wrap app with QueryClientProvider, init APIClient token store
 * SCOPE:  IN: provider setup, APIClient init, auth redirect
 *         OUT: screen UI (each screen handles that)
 */

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initAPIClient } from '@/services/api/APIClient';
import { buildTokenStore, useSessionStore } from '@/store/sessionStore';
import '../global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:      2,
      staleTime:  60_000, // 1 minute
    },
  },
});

// Wire APIClient with session token store once at startup
initAPIClient(buildTokenStore());

function AuthGuard() {
  const router      = useRouter();
  const segments    = useSegments();
  const isLoggedIn  = useSessionStore((s) => s.isLoggedIn);

  useEffect(() => {
    const inTabs = segments[0] === '(tabs)';
    if (!isLoggedIn && inTabs) {
      router.replace('/onboarding');
    }
  }, [isLoggedIn, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)"        options={{ headerShown: false }} />
        <Stack.Screen name="onboarding"    options={{ presentation: 'modal' }} />
        <Stack.Screen name="patch-connect" options={{ presentation: 'modal' }} />
      </Stack>
    </QueryClientProvider>
  );
}

