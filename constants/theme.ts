/**
 * PART:   Constants — Theme (Ethereal Elevation Design System)
 * ACTOR:  Gemini 3.1
 * PHASE:  1 → 11 → 12-UI-Redesign
 * READS:  GEMINI_PHASES.md §Design Language, PLAN_B §XI
 * TASK:   Multi-layered shadow system for floating card depth
 * SCOPE:  IN: visual tokens only
 *         OUT: logic, API, business rules
 */

// ── ETHEREAL ELEVATION PALETTE (Light) ──
export const lightColors = {
  background: '#F0F4FF',      // Soft Blue-White canvas
  surface: '#FFFFFF',          // Pure card surface
  surfaceElevated: '#F8FAFF',  // Inner card / input bg
  surfaceGlass: 'rgba(255,255,255,0.72)', // Glassmorphism card
  primary: '#4F6EF7',          // Nebula Blue — CTAs
  primaryDark: '#3B55D4',      // Pressed state
  secondary: '#22D3A8',        // Teal Mint — health positive
  accent: '#9B8FFF',           // Lavender — highlights/badges
  tertiary: '#A5C8FF',         // Sky haze — ring glow
  text: {
    primary: '#1A1F36',        // Near-black, deep ink
    secondary: '#4A5578',      // Mid-tone body
    muted: '#9BA5C2',          // Hint / disabled
    inverse: '#FFFFFF',
  },
  health: {
    good: '#22D3A8',           // Teal
    warning: '#F5A623',        // Amber
    danger: '#F44C7F',         // rose
    info: '#4F6EF7',           // Nebula Blue
    excellent: '#22D3A8',
  },
  border: '#E4EAFF',           // Periwinkle rule
  gradients: {
    hero: ['#4F6EF7', '#9B8FFF'],   // Blue → Lavender
    scoreRing: ['#4F6EF7', '#22D3A8'],   // Blue → Teal
    cta: ['#4F6EF7', '#3B55D4'],
    mint: ['#22D3A8', '#1AB99A'],
    aiProcessing: ['#9B8FFF', '#4F6EF7'],
    card: ['#FFFFFF', '#F0F4FF'],
    danger: ['#F44C7F', '#C0325A'],
  },
} as const;

// ── DARK MODE (Ethereal Deep) ──
export const darkColors = {
  background: '#11151F',
  surface: '#1C2136',
  surfaceElevated: '#242B45',
  surfaceGlass: 'rgba(28,33,54,0.80)',
  primary: '#7C9EFF',
  primaryDark: '#4F6EF7',
  secondary: '#22D3A8',
  accent: '#B8ADFF',
  tertiary: '#A5C8FF',
  text: {
    primary: '#E9EEFF',
    secondary: '#8A96C0',
    muted: '#4A5578',
    inverse: '#11151F',
  },
  health: {
    good: '#22D3A8',
    warning: '#FBC05D',
    danger: '#FF6FA3',
    info: '#7C9EFF',
    excellent: '#22D3A8',
  },
  border: '#2E3860',
  gradients: {
    hero: ['#7C9EFF', '#B8ADFF'],
    scoreRing: ['#7C9EFF', '#22D3A8'],
    cta: ['#7C9EFF', '#4F6EF7'],
    mint: ['#22D3A8', '#16B89B'],
    aiProcessing: ['#B8ADFF', '#7C9EFF'],
    card: ['#1C2136', '#11151F'],
    danger: ['#FF6FA3', '#C0325A'],
  },
} as const;

// PHASE 11: backward-compatible alias
export const colors = lightColors;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 8, md: 14, lg: 24, xl: 32, full: 9999 } as const;

export const fonts = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 28, hero: 48 },
} as const;

// ── ETHEREAL ELEVATION SHADOWS ──
// Combine two shadows on Android: primary deep shadow + top-edge highlight
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  low: {
    shadowColor: '#4F6EF7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  mid: {
    shadowColor: '#4F6EF7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
  high: {
    shadowColor: '#4F6EF7',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.20,
    shadowRadius: 32,
    elevation: 12,
  },
  glow: {
    shadowColor: '#9B8FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

// ── Legacy glow strings (kept for web/SVG) ──
export const glows = {
  blue: '0 0 20px rgba(79,110,247,0.30)',
  mint: '0 0 20px rgba(34,211,168,0.30)',
  coral: '0 0 20px rgba(244,76,127,0.30)',
} as const;
