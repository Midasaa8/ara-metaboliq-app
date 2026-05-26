/**
 * PART:   UpgradeGate — blurred premium feature preview + upgrade CTA
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  34s — Premium / Monetization
 * TASK:   Wrap premium-only content; if !isPremium → blurred overlay + "Nâng cấp" button
 * SCOPE:  IN: usePremium.isPremium
 *         OUT: none
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Lock, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  isPremium: boolean;
  featureName: string;
  onUpgrade: () => void;
  children: React.ReactNode;
}

export function UpgradeGate({ isPremium, featureName, onUpgrade, children }: Props) {
  const { colors, fonts } = useTheme();

  if (isPremium) return <>{children}</>;

  return (
    <View style={s.root}>
      {/* Blurred preview */}
      <View style={[s.blurWrap, { opacity: 0.3 }]} pointerEvents="none">
        {children}
      </View>
      {/* Overlay */}
      <View style={[s.overlay, { backgroundColor: colors.background + 'E6' }]}>
        <View style={[s.iconWrap, { backgroundColor: colors.primary + '20' }]}>
          <Lock size={28} color={colors.primary} strokeWidth={2} />
        </View>
        <Text style={[s.title, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          {featureName}
        </Text>
        <Text style={[s.desc, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          Tính năng này dành cho Premium
        </Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={onUpgrade}>
          <Sparkles size={18} color="#FFF" strokeWidth={2} />
          <Text style={[s.btnText, { fontFamily: fonts.bold }]}>Nâng cấp Premium</Text>
        </TouchableOpacity>
        <Text style={[s.trial, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          Dùng thử 7 ngày miễn phí
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { position: 'relative', overflow: 'hidden', borderRadius: 16 },
  blurWrap: {},
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, textAlign: 'center' },
  desc: { fontSize: 13, textAlign: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  btnText: { color: '#FFF', fontSize: 14 },
  trial: { fontSize: 12 },
});
