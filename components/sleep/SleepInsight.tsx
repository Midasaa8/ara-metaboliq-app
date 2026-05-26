/**
 * PART:   SleepInsight — AI-style insight text card
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  26s — Sleep Service
 * TASK:   Display actionable sleep insights from useSleepScore, Fitbit-style
 * SCOPE:  IN: insights string[] from SleepScoreBreakdown
 *         OUT: none (display only)
 */

import { View, Text, StyleSheet } from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  insights: string[];
}

export function SleepInsight({ insights }: Props) {
  const { colors, fonts } = useTheme();

  if (insights.length === 0) return null;

  return (
    <View style={[s.card, { backgroundColor: colors.surfaceElevated }]}>
      <View style={s.header}>
        <View style={[s.icon, { backgroundColor: '#F59E0B' + '22' }]}>
          <Lightbulb size={18} color="#F59E0B" strokeWidth={2} />
        </View>
        <Text style={[s.title, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          Gợi ý cho giấc ngủ
        </Text>
      </View>
      {insights.map((text, i) => (
        <View key={i} style={s.row}>
          <View style={[s.bullet, { backgroundColor: colors.secondary }]} />
          <Text style={[s.text, { color: colors.text.secondary, fontFamily: fonts.regular }]}>
            {text}
          </Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  text: { flex: 1, fontSize: 13, lineHeight: 20 },
});
