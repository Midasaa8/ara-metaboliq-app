/**
 * PART:   Zustand — Session store (tokens + auth state)
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  1 — Project Setup
 * READS:  AGENTS.md §11 Security
 * TASK:   Auth token management — access/refresh token lifecycle
 * SCOPE:  IN: token state + setters (used by APIClient interceptor)
 *         OUT: token persistence (use expo-secure-store in Phase 20 security layer)
 *
 * SECURITY: Tokens are kept in memory only in hackathon.
 *           Phase 20 (Opus): swap to AES-256-GCM via expo-secure-store.
 */

import { create } from 'zustand';

interface SessionStore {
  // -- State --
  accessToken:  string | null;
  refreshToken: string | null;
  isLoggedIn:   boolean;

  // -- Setters (synchronous — used internally) --
  setTokens:   (access: string, refresh: string) => void;
  clearTokens: () => void;

  // -- Async — used by APIClient interceptor --
  getAccessToken:  () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  accessToken:  null,
  refreshToken: null,
  isLoggedIn:   false,

  setTokens: (access, refresh) =>
    set({ accessToken: access, refreshToken: refresh, isLoggedIn: true }),

  clearTokens: () =>
    set({ accessToken: null, refreshToken: null, isLoggedIn: false }),

  // Async wrappers (Phase 20: replace with SecureStore read)
  getAccessToken:  async () => get().accessToken,
  getRefreshToken: async () => get().refreshToken,
}));

// -- Token store adapter for APIClient.initAPIClient() --
// Call this at app startup in _layout.tsx
export function buildTokenStore() {
  const store = useSessionStore.getState();
  return {
    getAccessToken:  store.getAccessToken,
    getRefreshToken: store.getRefreshToken,
    setTokens: async (access: string, refresh: string) => {
      useSessionStore.getState().setTokens(access, refresh);
    },
    clearTokens: async () => {
      useSessionStore.getState().clearTokens();
    },
  };
}
