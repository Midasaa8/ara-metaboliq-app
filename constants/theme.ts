/**
 * PART:   Constants — Theme (Single Source of Truth)
 * ACTOR:  Gemini 3.1
 * PHASE:  1 — Project Setup
 * READS:  GEMINI_PHASES.md (Quy tắc màu sắc Y tế)
 * TASK:   Healthcare dual-mode color system (Light default + Dark option)
 * SCOPE:  IN: visual tokens only
 *         OUT: logic, API, business rules
 */

// ── LIGHT MODE (default) ──
export const lightColors = {
  background: '#F8FAFB', // Snow — nền chính
  surface: '#FFFFFF', // White — card, modal
  surfaceElevated: '#F1F5F9', // Fog — input, inner card
  primary: '#2563EB', // Trust Blue — CTA, active
  primaryDark: '#1D4ED8', // Trust Blue Dark
  secondary: '#059669', // Heal Green — health positive
  tertiary: '#93C5FD', // Sky — score ring glow
  text: { primary: '#1E293B', secondary: '#64748B', muted: '#CBD5E1' },
  health: { good: '#10B981', warning: '#D97706', danger: '#DC2626', info: '#2563EB' },
  border: '#E2E8F0', // Pearl
  gradients: {
    scoreRing: ['#2563EB', '#059669'],
    cta: ['#2563EB', '#1D4ED8'],
    aiProcessing: ['#2563EB', '#93C5FD'],
    dangerZone: ['#DC2626', '#B91C1C'],
  },
} as const;

// ── DARK MODE ──
export const darkColors = {
  background: '#181818', // Deep Grey — KHÔNG đen tuyền
  surface: '#1E1E1E', // Card Dark
  surfaceElevated: '#2C2C2C', // Elevated
  primary: '#60A5FA', // Soft Blue (desaturated)
  primaryDark: '#3B82F6', // Soft Blue Darker
  secondary: '#34D399', // Soft Teal (desaturated)
  tertiary: '#A8DADC', // Pastel Cyan
  text: { primary: '#E4E4E4', secondary: '#A1A1AA', muted: '#52525B' },
  health: { good: '#6EE7B7', warning: '#FCD34D', danger: '#FCA5A5', info: '#60A5FA' },
  border: '#3F3F46', // Graphite
  gradients: {
    scoreRing: ['#60A5FA', '#34D399'],
    cta: ['#60A5FA', '#3B82F6'],
    aiProcessing: ['#60A5FA', '#A8DADC'],
    dangerZone: ['#FCA5A5', '#F87171'],
  },
} as const;

// HACKATHON: Hardcode current theme to Light Mode so we don't break existing components
export const colors = lightColors;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 8, md: 16, lg: 24, full: 9999 } as const;

export const fonts = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  bold: 'SpaceGrotesk-Bold',
  sizes: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 28, hero: 48 }
} as const;

// -- Glow effects (for AI elements, score ring) --
export const glows = {
  blue: '0 0 12px rgba(37, 99, 235, 0.20)',
  mint: '0 0 12px rgba(5, 150, 105, 0.20)',
  coral: '0 0 12px rgba(220, 38, 38, 0.25)',
} as const;
