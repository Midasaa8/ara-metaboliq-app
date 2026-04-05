/**
 * PART:   Constants — API endpoints
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  1 — Project Setup
 * TASK:   API base URL + all endpoint paths (single source of truth)
 * SCOPE:  IN: URL constants, endpoint paths
 *         OUT: business logic, request/response handling (each API file does that)
 */

export const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://api.ara-metaboliq.com'; // TODO: replace with production URL before Phase 24

export const ENDPOINTS = {
  auth: {
    login:   '/auth/login',
    refresh: '/auth/refresh',
    logout:  '/auth/logout',
  },
  health: {
    score:    '/health/score',
    readings: '/health/readings',
    history:  '/health/history',
    reading:  '/health/reading',
  },
  voice: {
    analyze: '/voice/analyze',
    history: '/voice/history',
  },
  sleep: {
    last:    '/sleep/last-night',
    history: '/sleep/history',
  },
  nutrition: {
    scan:    '/nutrition/scan',
    history: '/nutrition/history',
  },
  insurance: {
    premium:     '/insurance/premium',
    discount:    '/insurance/discount',
    recalculate: '/insurance/recalculate',
    history:     '/insurance/history',
    suggestions: '/insurance/suggestions',
  },
  hsa: {
    balance:      '/hsa/balance',
    transactions: '/hsa/transactions',
    trigger:      '/hsa/trigger',
    projection:   '/hsa/projection',
  },
  exercise: {
    session: '/exercise/session',
    history: '/exercise/history',
  },
  twin: {
    prediction: '/twin/prediction',
    simulate:   '/twin/simulate',
  },
  chronos: {
    timeline: '/chronos/timeline',
    schedule: '/chronos/schedule',
  },
  wearable: {
    sync:           '/wearable/sync',
    latest:         '/wearable/latest',
    fitbitCallback: '/wearable/fitbit/callback',
  },
} as const;
