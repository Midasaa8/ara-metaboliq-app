/**
 * PART:   ChallengeCard — single challenge with leaderboard preview
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  31s — Challenges & Social
 * TASK:   Progress bar, participant ranking preview (top 3), days remaining
 * SCOPE:  IN: Challenge from ChallengeService
 *         OUT: none (display + leave action)
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Trophy, Users, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { Challenge } from '@/services/social/ChallengeService';

interface Props {
  challenge: Challenge;
  onLeave: (id: string) => void;
}

export function ChallengeCard({ challenge, onLeave }: Props) {
  const { colors, fonts } = useTheme();
  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / 86400_000));
  const pct = Math.min(1, challenge.myProgress / challenge.target);
  const sorted = [...challenge.participants].sort((a, b) => b.progress - a.progress);
  const myRank = sorted.findIndex((p) => p.userId === 'me') + 1;

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={[s.icon, { backgroundColor: colors.primary + '20' }]}>
          <Trophy size={18} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: colors.text.primary, fontFamily: fonts.bold }]}>
            {challenge.title}
          </Text>
          <Text style={[s.meta, { color: colors.text.muted, fontFamily: fonts.regular }]}>
            <Users size={11} color={colors.text.muted} /> {challenge.participants.length} người · {daysLeft} ngày còn lại
          </Text>
        </View>
        <TouchableOpacity onPress={() => onLeave(challenge.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={16} color={colors.text.muted} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* My progress */}
      <View style={s.progressSection}>
        <View style={s.progressRow}>
          <Text style={[s.progressLabel, { color: colors.text.secondary, fontFamily: fonts.regular }]}>
            Của bạn: {challenge.myProgress.toLocaleString()} / {challenge.target.toLocaleString()} {challenge.unit}
          </Text>
          <Text style={[s.rank, { color: colors.primary, fontFamily: fonts.bold }]}>
            #{myRank}
          </Text>
        </View>
        <View style={[s.track, { backgroundColor: colors.border }]}>
          <View style={[s.fill, { width: `${pct * 100}%`, backgroundColor: colors.primary }]} />
        </View>
      </View>

      {/* Top 3 */}
      <View style={s.podium}>
        {sorted.slice(0, 3).map((p, i) => (
          <View key={p.userId} style={[s.participant, p.userId === 'me' && { backgroundColor: colors.primary + '10', borderRadius: 8 }]}>
            <Text style={s.rankNum}>{['🥇', '🥈', '🥉'][i]}</Text>
            <Text style={s.avatar}>{p.avatarEmoji}</Text>
            <Text style={[s.pName, { color: colors.text.primary, fontFamily: fonts.semibold }]}>
              {p.displayName}
            </Text>
            <Text style={[s.pVal, { color: colors.text.muted, fontFamily: fonts.regular }]}>
              {p.progress.toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, gap: 12, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14 },
  meta: { fontSize: 12, marginTop: 2 },
  progressSection: { gap: 6 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 12 },
  rank: { fontSize: 14 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  podium: { flexDirection: 'row', gap: 4 },
  participant: { flex: 1, alignItems: 'center', padding: 6, gap: 2 },
  rankNum: { fontSize: 14 },
  avatar: { fontSize: 20 },
  pName: { fontSize: 11 },
  pVal: { fontSize: 11 },
});
