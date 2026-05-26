/**
 * PART:   GoalProjection — card showing projected date to reach target weight
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  25s — Weight & Body Composition
 * TASK:   Display projected date + days remaining based on linear trend analysis
 * SCOPE:  IN: projection result from WeightService.projectGoalDate
 *         OUT: none (display only)
 */

import { View, Text, StyleSheet } from 'react-native';
import { Target, TrendingDown, TrendingUp, HelpCircle } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  goal_kg: number;
  current_kg: number | null;
  projection: { date: string; days_remaining: number } | null;
}

export function GoalProjection({ goal_kg, current_kg, projection }: Props) {
  const { colors, fonts } = useTheme();

  const delta = current_kg ? Math.round((current_kg - goal_kg) * 10) / 10 : null;
  const isLoss = delta !== null && delta > 0;

  return (
    <View style={[s.card, { backgroundColor: colors.surface }]}>
      <View style={s.row}>
        <View style={[s.icon, { backgroundColor: colors.secondary + '20' }]}>
          <Target size={20} color={colors.secondary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: colors.text.primary, fontFamily: fonts.bold }]}>
            Mục tiêu cân nặng
          </Text>
          <Text style={[s.subtitle, { color: colors.text.muted, fontFamily: fonts.regular }]}>
            {goal_kg} kg
            {delta !== null && (
              <Text style={{ color: isLoss ? colors.health.warning : colors.health.good }}>
                {' '}({isLoss ? `-${delta}` : `+${Math.abs(delta)}`} kg cần ${isLoss ? 'giảm' : 'tăng'})
              </Text>
            )}
          </Text>
        </View>
        {isLoss
          ? <TrendingDown size={18} color={colors.health.warning} strokeWidth={2} />
          : <TrendingUp size={18} color={colors.health.good} strokeWidth={2} />
        }
      </View>

      {projection
        ? (
          <View style={[s.projBox, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[s.projDate, { color: colors.text.primary, fontFamily: fonts.black }]}>
              {new Date(projection.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            <Text style={[s.projDays, { color: colors.text.muted, fontFamily: fonts.regular }]}>
              ~{projection.days_remaining} ngày nữa (dựa theo xu hướng hiện tại)
            </Text>
          </View>
        )
        : (
          <View style={[s.projBox, { backgroundColor: colors.surfaceElevated }]}>
            <HelpCircle size={16} color={colors.text.muted} strokeWidth={2} />
            <Text style={[s.projDays, { color: colors.text.muted, fontFamily: fonts.regular }]}>
              Cần ít nhất 3 lần cân để dự đoán
            </Text>
          </View>
        )
      }
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 18, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14 },
  subtitle: { fontSize: 13, marginTop: 2 },
  projBox: { borderRadius: 12, padding: 12, gap: 4, flexDirection: 'column' },
  projDate: { fontSize: 17 },
  projDays: { fontSize: 12 },
});
