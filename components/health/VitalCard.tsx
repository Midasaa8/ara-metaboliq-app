/**
 * PART:   VitalCard — mini health sub-score card
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  3 — Home Dashboard
 * READS:  PLAN_B §XI Home Screen, constants/theme.ts
 * TASK:   Icon + score + label card with colour-coded score bar
 * SCOPE:  IN: visual display of one sub-score
 *         OUT: tap navigation to detail screens (Phase 3+ routing)
 */

import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface VitalCardProps {
  icon: IoniconName;
  score: number;       // 0–100
  label: string;
  onPress?: () => void;
}

function scoreColor(score: number): string {
  if (score >= 80) return colors.health.good;
  if (score >= 60) return colors.secondary;
  if (score >= 40) return colors.health.warning;
  return colors.health.danger;
}

export function VitalCard({ icon, score, label, onPress }: VitalCardProps) {
  const color = scoreColor(score);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={`${label} score ${score}`}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.score, { color }]}>{score}</Text>
      <Text style={styles.label}>{label}</Text>

      {/* Mini progress bar */}
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${score}%` as `${number}%`, backgroundColor: color }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 72,
  },
  score: {
    fontSize: fonts.sizes.xl,
    fontWeight: '800',
    lineHeight: 26,
  },
  label: {
    color: colors.text.secondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  barBg: {
    width: '100%',
    height: 3,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  barFill: {
    height: 3,
    borderRadius: radius.full,
  },
});
