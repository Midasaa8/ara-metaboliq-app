/**
 * PART:   APIClient — HTTP client singleton
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  1 — Project Setup
 * READS:  AGENTS.md §9 API Endpoints, §11 Security
 * TASK:   Axios instance with auth interceptor, 401 refresh flow, retry × 3
 * SCOPE:  IN: base URL, auth header injection, 401 refresh, retry logic
 *         OUT: business logic, response parsing (each API file handles that)
 */

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import { API_BASE_URL } from '@/constants/api';

// -- Types --

interface TokenStore {
  getAccessToken: () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
  setTokens: (access: string, refresh: string) => Promise<void>;
  clearTokens: () => Promise<void>;
}

// Token store is injected at app startup (avoids circular dependency with sessionStore)
let _tokenStore: TokenStore | null = null;

export function initAPIClient(store: TokenStore): void {
  _tokenStore = store;
}

// -- Create instance --

const APIClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// -- Request interceptor: inject Bearer token --

APIClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await _tokenStore?.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// -- Response interceptor: handle 401 → refresh → retry --

let _isRefreshing = false;
let _refreshQueue: Array<(token: string) => void> = [];

APIClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry && _tokenStore) {
      if (_isRefreshing) {
        // Queue requests while refresh is in-flight
        return new Promise((resolve) => {
          _refreshQueue.push((newToken) => {
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(APIClient(original));
          });
        });
      }

      original._retry = true;
      _isRefreshing = true;

      try {
        const refreshToken = await _tokenStore.getRefreshToken();
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        const { access_token, refresh_token } = data;
        await _tokenStore.setTokens(access_token, refresh_token);

        _refreshQueue.forEach((cb) => cb(access_token));
        _refreshQueue = [];

        original.headers.Authorization = `Bearer ${access_token}`;
        return APIClient(original);
      } catch {
        // Refresh failed — clear tokens, let app redirect to login
        await _tokenStore.clearTokens();
        _refreshQueue = [];
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default APIClient;
