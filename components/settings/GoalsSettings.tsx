/**
 * PART:   GoalsSettings — step, sleep, water, weight, AZM targets
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  33s — Settings Architecture
 * TASK:   Editable health goal fields with +/- buttons
 * SCOPE:  IN: useSettings.goals
 *         OUT: none
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { HealthGoals } from '@/services/settings/SettingsService';

interface Props {
  goals: HealthGoals;
  onUpdate: (g: Partial<HealthGoals>) => void;
}

function GoalRow({ emoji, label, value, unit, step, min, max, onInc, onDec }: {
  emoji: string; label: string; value: number | null; unit: string;
  step: number; min: number; max: number;
  onInc: () => void; onDec: () => void;
}) {
  const { colors, fonts } = useTheme();
  const display = value != null ? `${value.toLocaleString()}` : '—';
  return (
    <View style={[s.row, { borderBottomColor: colors.border }]}>
      <Text style={s.emoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[s.label, { color: colors.text.primary, fontFamily: fonts.semibold }]}>{label}</Text>
        <Text style={[s.unitText, { color: colors.text.muted, fontFamily: fonts.regular }]}>{unit}</Text>
      </View>
      <View style={s.stepper}>
        <TouchableOpacity style={[s.stepBtn, { backgroundColor: colors.surfaceElevated }]} onPress={onDec}>
          <Minus size={16} color={colors.text.secondary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[s.valueText, { color: colors.text.primary, fontFamily: fonts.black }]}>{display}</Text>
        <TouchableOpacity style={[s.stepBtn, { backgroundColor: colors.primary + '20' }]} onPress={onInc}>
          <Plus size={16} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function GoalsSettings({ goals, onUpdate }: Props) {
  const { colors, fonts } = useTheme();
  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: colors.text.primary, fontFamily: fonts.bold }]}>Mục tiêu sức khoẻ</Text>
      <GoalRow emoji="👣" label="Bước chân / ngày" value={goals.stepTarget} unit="bước"
        step={1000} min={3000} max={30000}
        onInc={() => onUpdate({ stepTarget: Math.min(30000, goals.stepTarget + 1000) })}
        onDec={() => onUpdate({ stepTarget: Math.max(3000, goals.stepTarget - 1000) })}
      />
      <GoalRow emoji="🌙" label="Giấc ngủ / đêm" value={Math.round(goals.sleepTargetMin / 60 * 10) / 10} unit="giờ"
        step={30} min={300} max={660}
        onInc={() => onUpdate({ sleepTargetMin: Math.min(660, goals.sleepTargetMin + 30) })}
        onDec={() => onUpdate({ sleepTargetMin: Math.max(300, goals.sleepTargetMin - 30) })}
      />
      <GoalRow emoji="💧" label="Nước / ngày" value={goals.waterTargetMl} unit="ml"
        step={250} min={1000} max={4000}
        onInc={() => onUpdate({ waterTargetMl: Math.min(4000, goals.waterTargetMl + 250) })}
        onDec={() => onUpdate({ waterTargetMl: Math.max(1000, goals.waterTargetMl - 250) })}
      />
      <GoalRow emoji="⚡" label="Active Zone Minutes / tuần" value={goals.azmWeeklyTarget} unit="phút AZM"
        step={30} min={60} max={300}
        onInc={() => onUpdate({ azmWeeklyTarget: Math.min(300, goals.azmWeeklyTarget + 30) })}
        onDec={() => onUpdate({ azmWeeklyTarget: Math.max(60, goals.azmWeeklyTarget - 30) })}
      />
    </View>
  );
}

const s = StyleSheet.create({
  section: { gap: 4 },
  sectionTitle: { fontSize: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  emoji: { fontSize: 22 },
  label: { fontSize: 14 },
  unitText: { fontSize: 11, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  valueText: { fontSize: 16, width: 56, textAlign: 'center' },
});
