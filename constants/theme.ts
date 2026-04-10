/**
 * PART:   Constants — Theme (Healthcare Crimson + Teal — Reference Design)
 * ACTOR:  Claude Sonnet 4.6 + Gemini 3.1
 * PHASE:  UI Redesign v2 — Medical Reference Palette
 * TASK:   Match reference mockup color system — Crimson primary, Sky-blue bg, Teal accent
 *         Font: Nunito (rounded, friendly medical)
 *
 * COLOR STRATEGY (60-30-10 Rule):
 *   60% — Background: Sky Blue-Grey (#EBF2F5) — clinical, fresh canvas
 *   30% — Primary:  Healthcare Crimson (#C1274A) — authority, urgency, medical
 *   10% — Accent:   Healing Teal (#4ECFB5) — recovery, calm, biological status
 */

// ── LIGHT MODE (Healthcare Crisp) ──
export const lightColors = {
  // 60% — Background layer
  background: '#EBF2F5',         // Sky blue-grey — clinical fresh canvas
  surface: '#FFFFFF',             // White — card surface
  surfaceElevated: '#F0F6F9',     // Slight blue tint — inner card / input bg
  surfaceGlass: 'rgba(255,255,255,0.88)', // Glassmorphism overlay

  // 30% — Primary (crimson) + Supporting
  primary: '#C1274A',             // Healthcare Crimson — authority, trust
  primaryDark: '#9E1E3C',         // Pressed / dark variant
  secondary: '#4ECFB5',           // Healing Teal — recovery, biological status
  secondaryDark: '#38B8A0',       // Pressed teal
  accent: '#E8688A',              // Rose pink — gradient pair for crimson CTAs
  accentDark: '#D5547A',          // Pressed rose

  // Text (never pure black)
  text: {
    primary: '#1A2535',           // Deep navy-charcoal — readable on white
    secondary: '#5C6A7A',         // Slate grey
    muted: '#9BA8B5',             // Light steel
    inverse: '#FFFFFF',
  },

  // Health status colors
  health: {
    good: '#4ECFB5',              // Teal = healthy / good
    warning: '#F59E0B',           // Amber = caution
    danger: '#EF4444',            // Red = critical
    info: '#3B82F6',              // Blue = informational
    excellent: '#4ECFB5',         // Same as good (excellent)
  },

  // Borders & dividers
  border: '#D4E4EC',              // Soft sky border
  borderFocus: '#C1274A',         // Crimson highlight on focus

  // Gradient combos (from reference mockups)
  gradients: {
    hero: ['#C1274A', '#E8688A'],    // Crimson → Rose (reference hero cards)
    cta: ['#4ECFB5', '#38B8A0'],    // Teal → Deep Teal (biological status)
    calm: ['#EBF2F5', '#D4E4EC'],   // Sky → Pale Blue (background variety)
    nature: ['#4ECFB5', '#B5E0D8'], // Teal → Mint
    warmth: ['#E8688A', '#F5C1CE'], // Rose → Blush
    card: ['#FFFFFF', '#F5FAFB'],   // White → Ice
    scoreRing: ['#C1274A', '#E8688A'],
  },
} as const;

// ── DARK MODE (Healthcare Deep) ──
export const darkColors = {
  background: '#141920',          // Near-black navy
  surface: '#1E2530',             // Dark navy card
  surfaceElevated: '#252E3C',     // Slightly lighter navy
  surfaceGlass: 'rgba(20,25,32,0.88)',
  primary: '#E8688A',             // Rose (lighter crimson for dark bg)
  primaryDark: '#C1274A',         // Pressed → original crimson
  secondary: '#5EDFC9',           // Bright teal (pops on dark)
  secondaryDark: '#4ECFB5',
  accent: '#F09AAE',              // Pastel rose
  accentDark: '#E8688A',
  text: {
    primary: '#E8EEF4',           // Ice white — readable on dark
    secondary: '#9DAAB8',         // Muted steel
    muted: '#4F5E6E',             // Dark steel
    inverse: '#141920',
  },
  health: {
    good: '#5EDFC9',
    warning: '#FBB040',
    danger: '#F87171',
    info: '#60A5FA',
    excellent: '#5EDFC9',
  },
  border: '#2A3547',
  borderFocus: '#E8688A',
  gradients: {
    hero: ['#E8688A', '#C1274A'],
    cta: ['#5EDFC9', '#4ECFB5'],
    calm: ['#141920', '#1E2530'],
    nature: ['#5EDFC9', '#4ECFB5'],
    warmth: ['#F09AAE', '#E8688A'],
    card: ['#1E2530', '#141920'],
    scoreRing: ['#E8688A', '#F09AAE'],
  },
} as const;

// Backward-compatible alias (always light; screens using useTheme get reactive)
export const colors = lightColors;

// ── SPACING & RADIUS ──
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = {
  sm: 8,
  md: 12,      // Standard button corners
  lg: 16,      // Card corners (premium feel)
  xl: 24,      // Hero card / bottom sheet
  full: 9999,  // Pill / circle
} as const;

// ── TYPOGRAPHY (Nunito — Medical / Patient-Friendly Rounded) ──
export const fonts = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  black: 'Nunito_800ExtraBold',
  sizes: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 28, hero: 48 },
} as const;

// ── ELEVATION SHADOWS ──
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0, shadowRadius: 0, elevation: 0,
  },
  ambient: {
    shadowColor: '#1A2535',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  float: {
    shadowColor: '#1A2535',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 28,
    elevation: 8,
  },
  glow: {
    shadowColor: '#4ECFB5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// ── Legacy glow strings (web/SVG) ──
export const glows = {
  blue: '0 0 20px rgba(193,39,74,0.20)',
  mint: '0 0 20px rgba(78,207,181,0.25)',
  peach: '0 0 20px rgba(232,104,138,0.22)',
} as const;
