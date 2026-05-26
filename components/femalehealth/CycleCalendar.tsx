/**
 * PART:   CycleCalendar — monthly calendar with phase color highlighting
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  32s — Female Health UI
 * TASK:   Calendar grid with phase colors, fertile window, month navigation
 * SCOPE:  IN: DayInfo[] from useFemaleHealth
 *         OUT: none (display + tap to log)
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { DayInfo, CyclePhase } from '@/services/health/FemaleHealthService';

interface Props {
  calendarMonth: DayInfo[];
  viewYear: number;
  viewMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayPress: (date: string) => void;
}

const PHASE_COLOR: Record<CyclePhase, { bg: string; label: string }> = {
  menstrual:  { bg: '#EF4444', label: '🔴 Kinh nguyệt' },
  follicular: { bg: '#4ECFB5', label: '🟢 Nang trứng' },
  ovulation:  { bg: '#F59E0B', label: '🟡 Rụng trứng' },
  luteal:     { bg: '#6366F1', label: '🔵 Hoàng thể' },
};

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTH_NAMES = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

export function CycleCalendar({ calendarMonth, viewYear, viewMonth, onPrevMonth, onNextMonth, onDayPress }: Props) {
  const { colors, fonts } = useTheme();
  const today = new Date().toISOString().split('T')[0];

  // Compute first weekday offset (Monday=0)
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const offset = (firstDay + 6) % 7; // Mon-based
  const blanks = Array.from({ length: offset });

  return (
    <View style={s.root}>
      {/* Month navigation */}
      <View style={s.navRow}>
        <TouchableOpacity onPress={onPrevMonth} style={s.navBtn}>
          <ChevronLeft size={20} color={colors.text.secondary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[s.monthTitle, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={onNextMonth} style={s.navBtn}>
          <ChevronRight size={20} color={colors.text.secondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={s.weekRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={[s.weekDay, { color: colors.text.muted, fontFamily: fonts.semibold }]}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={s.grid}>
        {blanks.map((_, i) => <View key={`b${i}`} style={s.cell} />)}
        {calendarMonth.map((day) => {
          const isToday = day.date === today;
          const phaseColor = day.phase ? PHASE_COLOR[day.phase].bg : null;
          const d = parseInt(day.date.split('-')[2], 10);
          return (
            <TouchableOpacity key={day.date} style={s.cell} onPress={() => onDayPress(day.date)}>
              <View style={[s.dayCircle,
                phaseColor && { backgroundColor: phaseColor + (day.isPredicted ? '40' : 'CC') },
                isToday && { borderWidth: 2, borderColor: colors.primary },
              ]}>
                <Text style={[s.dayNum, { color: phaseColor ? '#FFF' : colors.text.primary, fontFamily: isToday ? fonts.bold : fonts.regular }]}>
                  {d}
                </Text>
                {day.isFertile && <View style={[s.fertileDot, { backgroundColor: '#F59E0B' }]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={s.legend}>
        {Object.entries(PHASE_COLOR).map(([phase, { bg, label }]) => (
          <View key={phase} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: bg }]} />
            <Text style={[s.legendText, { color: colors.text.muted, fontFamily: fonts.regular }]}>{label}</Text>
          </View>
        ))}
        <View style={s.legendItem}>
          <View style={[s.fertileDotLeg, { backgroundColor: '#F59E0B' }]} />
          <Text style={[s.legendText, { color: colors.text.muted, fontFamily: fonts.regular }]}>Cửa sổ màu mỡ</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 12 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navBtn: { padding: 4 },
  monthTitle: { fontSize: 16 },
  weekRow: { flexDirection: 'row' },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 13 },
  fertileDot: { position: 'absolute', bottom: 0, width: 5, height: 5, borderRadius: 2.5 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  fertileDotLeg: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 11 },
});
