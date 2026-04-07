/**
 * PART:   Shared Card component
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  3 — Home Dashboard (updated from Gemini skeleton)
 * TASK:   Dark-theme card wrapper with consistent surface background
 * SCOPE:  IN: visual container
 *         OUT: business logic
 */

import { View, StyleSheet, ViewProps } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

interface CardProps extends ViewProps {
  /** 'default' = Space Grey #1C1C1E | 'elevated' = Graphite #2C2C2E */
  variant?: 'default' | 'elevated';
}

export function Card({ variant = 'default', style, children, ...props }: CardProps) {
  const bg = variant === 'elevated' ? colors.surfaceElevated : colors.surface;

  return (
    <View
      style={[styles.card, { backgroundColor: bg }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding:      spacing.md,
    borderWidth:  1,
    borderColor:  colors.border,
  },
});

