/**
 * PART:   Constants — Theme (Wellness Ethereal Elevation — 60-30-10 Rule)
 * ACTOR:  Gemini 3.1
 * PHASE:  UI Redesign + Phase 13
 * TASK:   Mental-health-friendly color system with floating card shadows
 *
 * COLOR STRATEGY (60-30-10 Rule):
 *   60% — Background: Ivory White (#FBF9F5) — clean, breathable canvas
 *   30% — Secondary:  Soft Blue (#5B9BD5) / Sage Green (#7FBCA8) — calm, trustworthy
 *   10% — Accent:     Peach (#F5A67D) / Coral (#F28B82) — warm, inviting CTAs
 *   Text: Dark Charcoal (#2C2C2C) — never pure black, gentle on eyes
 */

// ── LIGHT MODE (Wellness Ivory) ──
export const lightColors = {
  // 60% — Background layer
  background: '#FBF9F5',         // Warm Ivory — main canvas
  surface: '#FFFFFF',             // Pure white — card surface
  surfaceElevated: '#F5F3EF',     // Warm fog — inner card / input bg
  surfaceGlass: 'rgba(255,255,255,0.80)', // Glassmorphism overlay

  // 30% — Secondary (content blocks, rings, progress bars)
  primary: '#5B9BD5',             // Soft Blue — trust, calm
  primaryDark: '#4A87C0',         // Pressed state
  secondary: '#7FBCA8',           // Sage Green — healing, balance
  secondaryDark: '#6BA894',       // Pressed green
  accent: '#F5A67D',              // Peach — 10% accent for CTAs
  accentDark: '#E8956D',          // Pressed peach

  // Text (never pure black)
  text: {
    primary: '#2C2C2C',           // Dark Charcoal
    secondary: '#6B7280',         // Warm Gray
    muted: '#A3A8B2',             // Light stone
    inverse: '#FFFFFF',
  },

  // Health status colors (softer variants)
  health: {
    good: '#7FBCA8',              // Sage Green
    warning: '#F5A67D',           // Peach/Amber
    danger: '#F28B82',            // Soft Coral
    info: '#5B9BD5',              // Soft Blue
    excellent: '#5EC4A0',         // Brighter Sage
  },

  // Borders & dividers
  border: '#EBE8E2',              // Warm pearl
  borderFocus: '#5B9BD5',         // Blue highlight on focus

  // Gradient combos
  gradients: {
    hero: ['#5B9BD5', '#7FBCA8'],   // Blue → Sage
    cta: ['#F5A67D', '#F28B82'],   // Peach → Coral
    calm: ['#5B9BD5', '#A8D4F0'],   // Blue → Light Sky
    nature: ['#7FBCA8', '#B5DBC9'],   // Sage → Light Mint
    warmth: ['#F5A67D', '#FDDEC0'],   // Peach → Cream
    card: ['#FFFFFF', '#FBF9F5'],   // White → Ivory
    scoreRing: ['#5B9BD5', '#7FBCA8'],
  },
} as const;

// ── DARK MODE (Wellness Deep) ──
export const darkColors = {
  background: '#1A1D23',
  surface: '#22262E',
  surfaceElevated: '#2C3038',
  surfaceGlass: 'rgba(34,38,46,0.85)',
  primary: '#82B8E0',
  primaryDark: '#5B9BD5',
  secondary: '#8FD4B8',
  secondaryDark: '#7FBCA8',
  accent: '#F5B896',
  accentDark: '#F5A67D',
  text: {
    primary: '#E8E6E3',
    secondary: '#9DA3AE',
    muted: '#5A6070',
    inverse: '#1A1D23',
  },
  health: {
    good: '#8FD4B8',
    warning: '#F5B896',
    danger: '#F5A0A0',
    info: '#82B8E0',
    excellent: '#8FD4B8',
  },
  border: '#363B44',
  borderFocus: '#82B8E0',
  gradients: {
    hero: ['#82B8E0', '#8FD4B8'],
    cta: ['#F5B896', '#F5A0A0'],
    calm: ['#82B8E0', '#A8D4F0'],
    nature: ['#8FD4B8', '#B5DBC9'],
    warmth: ['#F5B896', '#FDDEC0'],
    card: ['#22262E', '#1A1D23'],
    scoreRing: ['#82B8E0', '#8FD4B8'],
  },
} as const;

// Backward-compatible alias
export const colors = lightColors;

// ── SPACING & RADIUS ──
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = {
  sm: 8,
  md: 12,      // Standard button corners (friendly, inviting)
  lg: 16,      // Card corners (premium feel)
  xl: 24,      // Hero card
  full: 9999,  // Pill shape
} as const;

// ── TYPOGRAPHY ──
export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  black: 'Outfit_900Black',
  sizes: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 28, hero: 48 },
} as const;

// ── ETHEREAL ELEVATION SHADOWS (Multi-layered, floating cards) ──
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0, shadowRadius: 0, elevation: 0,
  },
  /** Subtle lift — for pills, chips, small interactive elements */
  low: {
    shadowColor: '#2C2C2C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  /** Standard floating card — main content cards */
  float: {
    shadowColor: '#2C2C2C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  /** Raised card — active/focused states, hero sections */
  raised: {
    shadowColor: '#5B9BD5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  /** Hero — top-level hero cards with color glow */
  hero: {
    shadowColor: '#5B9BD5',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },
  /** Warm glow — for CTA/accent elements */
  warmGlow: {
    shadowColor: '#F5A67D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
} as const;

// ── Legacy glow strings (web/SVG) ──
export const glows = {
  blue: '0 0 20px rgba(91,155,213,0.25)',
  mint: '0 0 20px rgba(127,188,168,0.25)',
  peach: '0 0 20px rgba(245,166,125,0.25)',
} as const;
