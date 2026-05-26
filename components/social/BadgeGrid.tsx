/**
 * PART:   BadgeGrid — achievement badges display with lock/unlock states
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  31s — Challenges & Social
 * TASK:   Grid of badge cards: emoji, title, description, unlock date; locked=greyed
 * SCOPE:  IN: Badge[] from useBadges
 *         OUT: none (display only)
 */

import { View, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { Badge } from '@/services/social/BadgeService';

interface Props {
  badges: Badge[];
  unlockedCount: number;
}

function BadgeCard({ badge }: { badge: Badge }) {
  const { colors, fonts } = useTheme();
  return (
    <View style={[s.card, { backgroundColor: badge.unlocked ? colors.surface : colors.surfaceElevated, borderColor: badge.unlocked ? colors.primary + '30' : colors.border, opacity: badge.unlocked ? 1 : 0.55 }]}>
      <View style={s.emojiWrap}>
        <Text style={[s.emoji, { fontSize: badge.unlocked ? 28 : 22 }]}>{badge.emoji}</Text>
        {!badge.unlocked && (
          <View style={[s.lockOverlay, { backgroundColor: colors.background }]}>
            <Lock size={12} color={colors.text.muted} strokeWidth={2.5} />
          </View>
        )}
      </View>
      <Text style={[s.title, { color: badge.unlocked ? colors.text.primary : colors.text.muted, fontFamily: fonts.bold }]} numberOfLines={2}>
        {badge.title}
      </Text>
      {badge.unlocked && badge.unlockedAt ? (
        <Text style={[s.date, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          {new Date(badge.unlockedAt).toLocaleDateString('vi-VN')}
        </Text>
      ) : (
        <Text style={[s.desc, { color: colors.text.muted, fontFamily: fonts.regular }]} numberOfLines={2}>
          {badge.description}
        </Text>
      )}
    </View>
  );
}

export function BadgeGrid({ badges, unlockedCount }: Props) {
  const { colors, fonts } = useTheme();

  return (
    <View style={s.root}>
      <View style={s.headerRow}>
        <Text style={[s.header, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          Huy hiệu
        </Text>
        <View style={[s.countBadge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[s.countText, { color: colors.primary, fontFamily: fonts.bold }]}>
            {unlockedCount}/{badges.length}
          </Text>
        </View>
      </View>
      <View style={s.grid}>
        {badges.map((b) => <BadgeCard key={b.id} badge={b} />)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  header: { fontSize: 15 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  countText: { fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '30%', borderRadius: 14, padding: 10, alignItems: 'center', gap: 6, borderWidth: 1, minHeight: 110 },
  emojiWrap: { position: 'relative' },
  emoji: { lineHeight: 36 },
  lockOverlay: { position: 'absolute', bottom: -2, right: -6, borderRadius: 8, padding: 2 },
  title: { fontSize: 11, textAlign: 'center' },
  date: { fontSize: 10, textAlign: 'center' },
  desc: { fontSize: 10, textAlign: 'center' },
});
