/**
 * PART:   TrialBanner — show trial countdown or upgrade prompt
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  34s — Premium / Monetization
 * TASK:   Dismissible banner: trial days left / "Start free trial" if free
 * SCOPE:  IN: usePremium state
 *         OUT: none
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles, Clock, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { SubscriptionStatus } from '@/services/monetization/PremiumService';

interface Props {
  status: SubscriptionStatus;
  trialDaysLeft: number | null;
  onStartTrial: () => void;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export function TrialBanner({ status, trialDaysLeft, onStartTrial, onUpgrade, onDismiss }: Props) {
  const { colors, fonts } = useTheme();

  if (status === 'premium') return null;

  if (status === 'trial' && trialDaysLeft != null) {
    return (
      <View style={[s.banner, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B40' }]}>
        <Clock size={18} color="#F59E0B" strokeWidth={2} />
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: colors.text.primary, fontFamily: fonts.bold }]}>
            Trial: còn {trialDaysLeft} ngày
          </Text>
          <Text style={[s.sub, { color: colors.text.muted, fontFamily: fonts.regular }]}>
            Nâng cấp để giữ tất cả tính năng Premium
          </Text>
        </View>
        <TouchableOpacity style={[s.btn, { backgroundColor: '#F59E0B' }]} onPress={onUpgrade}>
          <Text style={[s.btnText, { fontFamily: fonts.bold }]}>Nâng cấp</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={16} color={colors.text.muted} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    );
  }

  // Free — prompt start trial
  return (
    <View style={[s.banner, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
      <Sparkles size={18} color={colors.primary} strokeWidth={2} />
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          ARA Premium
        </Text>
        <Text style={[s.sub, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          Voice AI, OCR, Stress, Readiness & hơn thế nữa
        </Text>
      </View>
      <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={onStartTrial}>
        <Text style={[s.btnText, { fontFamily: fonts.bold }]}>Thử 7 ngày</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={16} color={colors.text.muted} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  title: { fontSize: 13 },
  sub: { fontSize: 11, marginTop: 2 },
  btn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16 },
  btnText: { color: '#FFF', fontSize: 12 },
});
