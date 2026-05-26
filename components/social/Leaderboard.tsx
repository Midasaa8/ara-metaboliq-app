/**
 * PART:   Leaderboard — ranked participant list for a challenge
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  31s — Challenges & Social
 * TASK:   Full ranked list: rank, avatar, name, progress bar, value
 * SCOPE:  IN: Challenge.participants array
 *         OUT: none (display only)
 */

import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { Participant } from '@/services/social/ChallengeService';

interface Props {
  participants: Participant[];
  target: number;
  unit: string;
}

function RankRow({ participant, rank, target, unit }: { participant: Participant; rank: number; target: number; unit: string }) {
  const { colors, fonts } = useTheme();
  const pct = Math.min(1, participant.progress / target);
  const isMe = participant.userId === 'me';
  const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

  return (
    <View style={[s.row, isMe && { backgroundColor: colors.primary + '10' }, { borderBottomColor: colors.border }]}>
      <Text style={[s.medal, { color: colors.text.muted, fontFamily: fonts.black }]}>
        {MEDALS[rank] ?? `${rank}`}
      </Text>
      <Text style={s.avatarText}>{participant.avatarEmoji}</Text>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={s.nameRow}>
          <Text style={[s.name, { color: isMe ? colors.primary : colors.text.primary, fontFamily: isMe ? fonts.bold : fonts.semibold }]}>
            {participant.displayName}{isMe ? ' (Bạn)' : ''}
          </Text>
          <Text style={[s.value, { color: colors.text.secondary, fontFamily: fonts.bold }]}>
            {participant.progress.toLocaleString()} {unit}
          </Text>
        </View>
        <View style={[s.track, { backgroundColor: colors.border }]}>
          <View style={[s.fill, { width: `${pct * 100}%`, backgroundColor: isMe ? colors.primary : colors.secondary }]} />
        </View>
      </View>
    </View>
  );
}

export function Leaderboard({ participants, target, unit }: Props) {
  const { colors, fonts } = useTheme();
  const sorted = [...participants].sort((a, b) => b.progress - a.progress);

  return (
    <View style={s.root}>
      <Text style={[s.header, { color: colors.text.primary, fontFamily: fonts.bold }]}>
        Bảng xếp hạng
      </Text>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.userId}
        renderItem={({ item, index }) => (
          <RankRow participant={item} rank={index + 1} target={target} unit={unit} />
        )}
        scrollEnabled={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 12 },
  header: { fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  medal: { width: 28, textAlign: 'center', fontSize: 14 },
  avatarText: { fontSize: 22 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 14 },
  value: { fontSize: 13 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});
