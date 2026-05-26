/**
 * PART:   DisclaimerBanner — always-visible medical disclaimer
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  27s — Voice AI Service Refactor
 * TASK:   Prominent disclaimer on ALL voice result screens, non-dismissible
 * SCOPE:  IN: none (static content)
 *         OUT: none
 */

import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

export function DisclaimerBanner() {
  const { colors, fonts } = useTheme();
  return (
    <View style={[s.banner, { backgroundColor: colors.health.warning + '18', borderColor: colors.health.warning + '40' }]}>
      <AlertTriangle size={16} color={colors.health.warning} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
      <Text style={[s.text, { color: colors.text.secondary, fontFamily: fonts.regular }]}>
        <Text style={{ fontFamily: fonts.bold }}>Lưu ý quan trọng: </Text>
        Đây là tín hiệu sức khỏe từ giọng nói, KHÔNG phải chẩn đoán y tế. Kết quả chỉ mang tính tham khảo. Hãy tham khảo bác sĩ nếu bạn có lo lắng về sức khỏe.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  text: { flex: 1, fontSize: 12, lineHeight: 18 },
});
