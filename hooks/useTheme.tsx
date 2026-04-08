/**
 * PART:   useTheme — Dual Mode Theme Hook + ThemeProvider
 * ACTOR:  Gemini 3.1
 * PHASE:  11 — Dual Theme
 * READS:  AGENTS.md §7, PLAN_B §XI Design Language, constants/theme.ts
 * TASK:   React Context for light/dark mode switching.
 *         Reads system preference by default, supports manual override.
 * SCOPE:  IN: ThemeProvider, useTheme() hook, ColorScheme type
 *         OUT: per-component StyleSheet (each screen owns its own)
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useMemo,
} from 'react';
import { useColorScheme } from 'react-native';
import {
    lightColors,
    darkColors,
    spacing,
    radius,
    fonts,
    glows,
} from '@/constants/theme';

// ── Types ──
export type ColorMode = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
    colors: typeof lightColors | typeof darkColors;
    mode: ColorMode;
    isDark: boolean;
    setMode: (mode: ColorMode) => void;
    toggleMode: () => void;
    spacing: typeof spacing;
    radius: typeof radius;
    fonts: typeof fonts;
    glows: typeof glows;
}

// ── Context ──
const ThemeContext = createContext<ThemeContextValue | null>(null);

// ── Provider ──
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme(); // 'light' | 'dark' | null
    const [mode, setModeState] = useState<ColorMode>('system');

    const setMode = useCallback((m: ColorMode) => setModeState(m), []);

    const isDark = useMemo(() => {
        if (mode === 'system') return systemScheme === 'dark';
        return mode === 'dark';
    }, [mode, systemScheme]);

    const colors = isDark ? darkColors : lightColors;

    const toggleMode = useCallback(() => {
        setModeState((prev) => {
            if (prev === 'system') return isDark ? 'light' : 'dark';
            return prev === 'dark' ? 'light' : 'dark';
        });
    }, [isDark]);

    const value = useMemo<ThemeContextValue>(() => ({
        colors,
        mode,
        isDark,
        setMode,
        toggleMode,
        spacing,
        radius,
        fonts,
        glows,
    }), [colors, mode, isDark, setMode, toggleMode]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

// ── useTheme hook ──
export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        // Fallback when used outside ThemeProvider (should not happen post-Phase 11)
        return {
            colors: lightColors,
            mode: 'light',
            isDark: false,
            setMode: () => { },
            toggleMode: () => { },
            spacing,
            radius,
            fonts,
            glows,
        };
    }
    return ctx;
}
