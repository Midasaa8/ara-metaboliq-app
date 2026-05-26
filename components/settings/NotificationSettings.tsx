/**
 * PART:   NotificationSettings — toggle switches for all notification types
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  33s — Settings Architecture
 * TASK:   Switch rows for each notification channel
 * SCOPE:  IN: useSettings.notifications
 *         OUT: none
 */

import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { NotificationPrefs } from '@/services/settings/SettingsService';

interface Props {
  prefs: NotificationPrefs;
  onUpdate: (p: Partial<NotificationPrefs>) => void;
}

const ROWS: { key: keyof NotificationPrefs; emoji: string; label: string; desc: string }[] = [
  { key: 'remindToMove', emoji: '🚶', label: 'Nhắc đứng dậy', desc: 'Mỗi giờ khi < 250 bước' },
  { key: 'bedtimeReminder', emoji: '🌙', label: 'Nhắc giờ ngủ', desc: '30 phút trước giờ ngủ mục tiêu' },
  { key: 'voiceCheckIn', emoji: '🎤', label: 'Nhắc Voice Check-in', desc: 'Hàng tuần nhắc ghi âm giọng nói' },
  { key: 'waterReminder', emoji: '💧', label: 'Nhắc uống nước', desc: 'Mỗi 2 giờ khi chưa đạt mục tiêu' },
  { key: 'exerciseReminder', emoji: '🏃', label: 'Nhắc tập luyện', desc: 'Hàng ngày nếu chưa tập' },
  { key: 'morningReadiness', emoji: '☀️', label: 'Readiness buổi sáng', desc: 'Thông báo điểm sẵn sàng mỗi sáng' },
];

export function NotificationSettings({ prefs, onUpdate }: Props) {
  const { colors, fonts } = useTheme();
  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: colors.text.primary, fontFamily: fonts.bold }]}>
        Thông báo
      </Text>
      {ROWS.map(({ key, emoji, label, desc }) => (
        <View key={key} style={[s.row, { borderBottomColor: colors.border }]}>
          <Text style={s.emoji}>{emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.label, { color: colors.text.primary, fontFamily: fonts.semibold }]}>{label}</Text>
            <Text style={[s.desc, { color: colors.text.muted, fontFamily: fonts.regular }]}>{desc}</Text>
          </View>
          <Switch
            value={prefs[key]}
            onValueChange={(v) => onUpdate({ [key]: v })}
            trackColor={{ false: colors.border, true: colors.primary + '80' }}
            thumbColor={prefs[key] ? colors.primary : colors.surfaceElevated}
          />
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  section: { gap: 4 },
  sectionTitle: { fontSize: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  emoji: { fontSize: 20 },
  label: { fontSize: 14 },
  desc: { fontSize: 11, marginTop: 2 },
});
