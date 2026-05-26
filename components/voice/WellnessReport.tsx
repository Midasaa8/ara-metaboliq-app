/**
 * PART:   WellnessReport — 5 health signal cards + overall score
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  27s — Voice AI Service Refactor
 * TASK:   Display 5 signal cards with score, level badge, progress bar + overall
 * SCOPE:  IN: VoiceWellnessResult from VoiceCheckInService
 *         OUT: none (display only)
 */

import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { DisclaimerBanner } from './DisclaimerBanner';
import type { VoiceWellnessResult, HealthSignal, SignalLevel } from '@/services/voice/VoiceCheckInService';

interface Props {
  result: VoiceWellnessResult;
}

const LEVEL_CONFIG: Record<SignalLevel, { label: string; color: string }> = {
  low:      { label: 'Tốt',       color: '#4ECFB5' },
  moderate: { label: 'Trung bình', color: '#F59E0B' },
  elevated: { label: 'Cao',       color: '#EF4444' },
};

function SignalCard({ signal }: { signal: HealthSignal }) {
  const { colors, fonts } = useTheme();
  const lvl = LEVEL_CONFIG[signal.level];

  return (
    <View style={[s.card, { backgroundColor: colors.surface }]}>
      <View style={s.cardHeader}>
        <Text style={s.emoji}>{signal.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.signalName, { color: colors.text.primary, fontFamily: fonts.bold }]}>
            {signal.label}
          </Text>
          <Text style={[s.signalDesc, { color: colors.text.muted, fontFamily: fonts.regular }]}>
            {signal.description}
          </Text>
        </View>
        <View style={[s.badge, { backgroundColor: lvl.color + '22' }]}>
          <Text style={[s.badgeText, { color: lvl.color, fontFamily: fonts.bold }]}>{lvl.label}</Text>
        </View>
      </View>
      <View style={s.barRow}>
        <View style={[s.track, { backgroundColor: colors.border }]}>
          <View style={[s.fill, { width: `${signal.score}%`, backgroundColor: lvl.color }]} />
        </View>
        <Text style={[s.score, { color: colors.text.primary, fontFamily: fonts.black }]}>
          {signal.score}
        </Text>
      </View>
    </View>
  );
}

export function WellnessReport({ result }: Props) {
  const { colors, fonts } = useTheme();
  const overallLevel = result.overall_score >= 70 ? 'low' : result.overall_score >= 40 ? 'moderate' : 'elevated';
  const overallColor = LEVEL_CONFIG[overallLevel].color;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.root}>
      {/* Overall score hero */}
      <View style={[s.hero, { backgroundColor: overallColor + '18' }]}>
        <Text style={[s.heroScore, { color: overallColor, fontFamily: fonts.black }]}>
          {result.overall_score}
        </Text>
        <Text style={[s.heroLabel, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          Voice Wellness Score
        </Text>
        <Text style={[s.heroDate, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          {new Date(result.recorded_at).toLocaleString('vi-VN')}
        </Text>
      </View>

      {/* 5 Signal Cards */}
      {result.signals.map((signal) => (
        <SignalCard key={signal.key} signal={signal} />
      ))}

      <DisclaimerBanner />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { gap: 12, paddingBottom: 32 },
  hero: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 6 },
  heroScore: { fontSize: 64 },
  heroLabel: { fontSize: 16 },
  heroDate: { fontSize: 12 },
  card: { borderRadius: 16, padding: 14, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 28 },
  signalName: { fontSize: 14 },
  signalDesc: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  score: { fontSize: 18, width: 36, textAlign: 'right' },
});
