/**
 * PART:   Home Dashboard — Healthcare Bento Grid
 * ACTOR:  Claude Sonnet 4.6 + Gemini 3.1
 * PHASE:  UI Redesign v2 — Reference Design (Crimson + Teal + Sky-blue)
 * READS:  hooks/useTheme.tsx, hooks/useHealthScore.ts, hooks/usePatchConnection.ts
 * TASK:   Bento grid home with: greeting, health score hero, vitals,
 *         quick-action modules, PPG waveform — all driven by useTheme
 */

import { useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity,
  StyleSheet, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Heart, Droplets, Activity,
  Mic2, Dumbbell, User,
  ShieldCheck, Zap, Wifi, WifiOff
} from 'lucide-react-native';

import { HealthScoreRing } from '@/components/health/HealthScoreRing';
import { PPGWaveform } from '@/components/health/PPGWaveform';
import { useHealthScore } from '@/hooks/useHealthScore';
import { usePatchConnection } from '@/hooks/usePatchConnection';
import { useUserStore } from '@/store/userStore';
import { useHealthStore } from '@/store/healthStore';
import { useTheme } from '@/hooks/useTheme';

const W = Dimensions.get('window').width;

export default function HomeScreen() {
  const router = require('expo-router').useRouter();
  const { colors, fonts, spacing, radius } = useTheme();

  const firstName = useUserStore((s) => s.profile?.fullName?.split(' ')[0] ?? 'there');
  const streakDays = useHealthStore((s) => s.streakDays);
  const { score, subScores, isLoading } = useHealthScore();
  const { isConnected, latestReading } = usePatchConnection();

  const [tapCount, setTapCount] = useState(0);
  function handleSecretTap() {
    if (tapCount + 1 >= 5) { setTapCount(0); router.push('/demo-flow'); }
    else setTapCount(tapCount + 1);
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  const scoreStatus =
    score >= 80 ? 'Trạng thái tối ưu — sẵn sàng cho mọi thứ.' :
    score >= 60 ? 'Sức khoẻ tốt hôm nay.' :
    'Cần nghỉ ngơi và phục hồi.';

  const pad = spacing.lg;
  const col = (W - pad * 2 - spacing.md) / 2;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <View style={[s.header, { paddingHorizontal: pad }]}>
          <View>
            <Text style={[s.greeting, { color: colors.text.muted, fontFamily: fonts.semibold }]}>
              {greeting}
            </Text>
            <Text style={[s.name, { color: colors.text.primary, fontFamily: fonts.black }]}>
              {firstName} 👋
            </Text>
          </View>

          {/* Pod status chip */}
          <TouchableOpacity
            style={[s.podChip, { backgroundColor: colors.surface, shadowColor: colors.text.primary }]}
            onPress={() => router.push('/patch-connect')}
            activeOpacity={0.8}
          >
            <View style={[s.podDot, { backgroundColor: isConnected ? colors.health.good : colors.border }]} />
            <Text style={[s.podText, { color: isConnected ? colors.health.good : colors.text.muted, fontFamily: fonts.bold }]}>
              {isConnected ? 'Pod' : 'Kết nối'}
            </Text>
            {isConnected ? <Wifi size={13} color={colors.health.good} /> : <WifiOff size={13} color={colors.text.muted} />}
          </TouchableOpacity>
        </View>

        {/* ── BENTO GRID ──────────────────────────────────────────────────── */}
        <View style={[s.grid, { paddingHorizontal: pad, gap: spacing.md }]}>

          {/* ── Hero Card (col-span-2) — Health Score Ring ── */}
          <TouchableOpacity activeOpacity={1} onPress={handleSecretTap} style={s.full}>
            <LinearGradient
              colors={colors.gradients.hero as [string, string]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[s.heroCard, { borderRadius: radius.xl }]}
            >
              {/* Badge */}
              <View style={s.heroBadge}>
                <Zap size={12} color="rgba(255,255,255,0.9)" />
                <Text style={[s.heroBadgeText, { fontFamily: fonts.bold }]}>CHỈ SỐ SỨC KHOẺ</Text>
              </View>

              {/* Score + Ring */}
              <View style={s.heroBody}>
                <View style={s.heroLeft}>
                  <Text style={[s.heroScoreVal, { fontFamily: fonts.black }]}>
                    {isLoading ? '—' : score}
                  </Text>
                  <Text style={[s.heroScoreLabel, { fontFamily: fonts.semibold }]}>/ 100</Text>
                  <Text style={[s.heroStatus, { fontFamily: fonts.medium }]}>{scoreStatus}</Text>
                  {streakDays > 0 && (
                    <View style={s.streakBadge}>
                      <Text style={[s.streakText, { fontFamily: fonts.bold }]}>🔥 {streakDays} ngày liên tiếp</Text>
                    </View>
                  )}
                </View>
                <View style={s.heroRight}>
                  {isLoading
                    ? <View style={s.ringPlaceholder} />
                    : <HealthScoreRing score={score} size={96} thickness={9} subScores={subScores} />}
                </View>
              </View>

              {/* Decorative bubble */}
              <View style={s.heroBubble} />
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Vital: HR ── */}
          <View style={[s.card, s.half, { width: col, backgroundColor: colors.surface, borderRadius: radius.lg, shadowColor: colors.text.primary }]}>
            <View style={[s.iconRound, { backgroundColor: colors.health.danger + '18' }]}>
              <Heart size={20} color={colors.health.danger} />
            </View>
            <Text style={[s.cardLabel, { color: colors.text.muted, fontFamily: fonts.semibold }]}>NHỊP TIM</Text>
            <View style={s.valRow}>
              <Text style={[s.cardVal, { color: colors.text.primary, fontFamily: fonts.black }]}>
                {latestReading?.hr ?? '--'}
              </Text>
              <Text style={[s.cardUnit, { color: colors.text.muted, fontFamily: fonts.medium }]}>bpm</Text>
            </View>
          </View>

          {/* ── Vital: SpO2 ── */}
          <View style={[s.card, s.half, { width: col, backgroundColor: colors.surface, borderRadius: radius.lg, shadowColor: colors.text.primary }]}>
            <View style={[s.iconRound, { backgroundColor: colors.secondary + '18' }]}>
              <Droplets size={20} color={colors.secondary} />
            </View>
            <Text style={[s.cardLabel, { color: colors.text.muted, fontFamily: fonts.semibold }]}>SPO₂</Text>
            <View style={s.valRow}>
              <Text style={[s.cardVal, { color: colors.text.primary, fontFamily: fonts.black }]}>
                {latestReading?.spo2 ?? '--'}
              </Text>
              <Text style={[s.cardUnit, { color: colors.text.muted, fontFamily: fonts.medium }]}>%</Text>
            </View>
          </View>

          {/* ── Quick Action Modules (2×2 grid) ── */}
          <ActionCard
            icon={Dumbbell} label="Tập luyện" sublabel="AI Trainer"
            gradient={[colors.primary, colors.accent] as [string,string]}
            onPress={() => router.push('/(tabs)/exercise')} col={col} radius={radius.lg}
          />
          <ActionCard
            icon={Activity} label="Sleep & Twin" sublabel="Phân tích giấc ngủ"
            gradient={[colors.secondary, colors.secondaryDark] as [string,string]}
            onPress={() => router.push('/(tabs)/twin')} col={col} radius={radius.lg}
          />
          <ActionCard
            icon={Mic2} label="Phân tích giọng" sublabel="Voice AI"
            gradient={['#5E79F0', '#8B9EF8'] as [string,string]}
            onPress={() => router.push('/(tabs)/voice')} col={col} radius={radius.lg}
          />
          <ActionCard
            icon={ShieldCheck} label="Bảo hiểm" sublabel="HSA & Tiết kiệm"
            gradient={['#F59E0B', '#FBBF24'] as [string,string]}
            onPress={() => router.push('/(tabs)/fintech')} col={col} radius={radius.lg}
          />

          {/* ── PPG Waveform (col-span-2) ── */}
          <View style={[s.full, s.card, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 0, overflow: 'hidden', shadowColor: colors.text.primary }]}>
            <View style={[s.waveHeader, { paddingHorizontal: spacing.lg, borderBottomColor: colors.border }]}>
              <Text style={[s.cardLabel, { color: colors.text.muted, fontFamily: fonts.semibold }]}>
                TÍN HIỆU SINH TRẮC
              </Text>
              <View style={[s.livePill, { backgroundColor: isConnected ? colors.health.good + '20' : colors.border + '40' }]}>
                <View style={[s.liveDot, { backgroundColor: isConnected ? colors.health.good : colors.text.muted }]} />
                <Text style={[s.liveText, { color: isConnected ? colors.health.good : colors.text.muted, fontFamily: fonts.bold }]}>
                  {isConnected ? 'LIVE' : 'Demo'}
                </Text>
              </View>
            </View>
            <View style={{ height: 110, marginTop: -16 }}>
              <PPGWaveform hr={latestReading?.hr ?? 72} isConnected={isConnected} />
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Action Card Component ────────────────────────────────────────────────────
function ActionCard({ icon: Icon, label, sublabel, gradient, onPress, col, radius: r }: {
  icon: any; label: string; sublabel: string;
  gradient: [string, string]; onPress: () => void; col: number; radius: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={{ width: col }}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.actionCard, { borderRadius: r, shadowColor: gradient[0] }]}
      >
        <View style={s.actionIconWrap}>
          <Icon size={22} color="#FFFFFF" strokeWidth={2.2} />
        </View>
        <Text style={[s.actionLabel, { fontFamily: 'Nunito_700Bold' }]}>{label}</Text>
        <Text style={[s.actionSub, { fontFamily: 'Nunito_400Regular' }]}>{sublabel}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingTop: 8 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, marginBottom: 8,
  },
  greeting: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 },
  name: { fontSize: 26, lineHeight: 30 },

  podChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  podDot: { width: 7, height: 7, borderRadius: 4 },
  podText: { fontSize: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  full: { width: '100%' },
  half: {},

  // Hero card
  heroCard: { padding: 22, overflow: 'hidden', position: 'relative' },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.22)', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, marginBottom: 16,
  },
  heroBadgeText: { color: '#FFF', fontSize: 10, letterSpacing: 1 },
  heroBody: { flexDirection: 'row', alignItems: 'center' },
  heroLeft: { flex: 1 },
  heroRight: { marginLeft: 12 },
  heroScoreVal: { color: '#FFF', fontSize: 58, lineHeight: 62 },
  heroScoreLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 2 },
  heroStatus: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 20, marginTop: 8, maxWidth: 180 },
  streakBadge: {
    marginTop: 10, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  streakText: { color: '#FFF', fontSize: 12 },
  ringPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroBubble: {
    position: 'absolute', right: -40, bottom: -50, width: 180, height: 180,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 90,
  },

  // Vitals card
  card: {
    padding: 16,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },
  iconRound: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardLabel: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  valRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  cardVal: { fontSize: 30 },
  cardUnit: { fontSize: 13 },

  // Action cards
  actionCard: {
    padding: 18, overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 6,
  },
  actionIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  actionLabel: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  actionSub: { color: 'rgba(255,255,255,0.80)', fontSize: 11, marginTop: 3 },

  // Waveform
  waveHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 14, paddingBottom: 8, borderBottomWidth: 1,
  },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, letterSpacing: 0.8 },
});
