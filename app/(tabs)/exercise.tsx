/**
 * PART:   Activity Screen — Steps, AZM, HR Zones, Exercise log
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  Phase 23s — Activity Service
 * TASK:   Full activity dashboard: daily steps ring, AZM, HR zones, activity history.
 *         Driven by useActivity hook (Health Connect or mock).
 * SCOPE:  IN: display metrics, manual exercise log entry
 *         OUT: real-time accelerometer (native build), GPS tracking (Phase 24s)
 */

import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import {
  Footprints, Zap, Flame, Clock,
  Heart, Activity, ChevronRight, RefreshCw,
  TrendingUp,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useActivity } from '@/hooks/useActivity';
import { formatDistance, DAILY_STEP_GOAL, WEEKLY_AZM_TARGET } from '@/services/health/activityService';

const W = Dimensions.get('window').width;
const RING_R = 70;
const RING_C = 2 * Math.PI * RING_R;

const MOCK_HISTORY = [
  { type: 'Walking',  duration: 32, calories: 128, time: '07:14', color: '#4ECFB5' },
  { type: 'Running',  duration: 18, calories: 210, time: '17:30', color: '#C1274A' },
  { type: 'Cycling',  duration: 45, calories: 340, time: '12:00', color: '#F59E0B' },
];

export default function ActivityScreen() {
  const { colors, fonts, spacing } = useTheme();
  const { metrics, zones, isLoading, isHealthConnectAvailable, refresh } = useActivity();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  const stepPct   = metrics.step_goal_pct / 100;
  const dashOffset = RING_C * (1 - stepPct);

  const pad = spacing.lg;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: 110, paddingHorizontal: pad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={[s.title, { color: colors.text.primary, fontFamily: fonts.black }]}>Activity</Text>
            <Text style={[s.sub, { color: colors.text.muted, fontFamily: fonts.regular }]}>
              {isHealthConnectAvailable ? 'Health Connect' : 'Mock data'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            style={[s.refreshBtn, { backgroundColor: colors.surface }]}
          >
            <RefreshCw size={18} color={refreshing ? colors.secondary : colors.text.muted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* ── Steps ring hero ── */}
        <LinearGradient
          colors={['#C1274A', '#E8688A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.heroCard, { borderRadius: 24 }]}
        >
          <View style={s.ringWrap}>
            <Svg width={170} height={170} viewBox="0 0 170 170">
              {/* Track */}
              <Circle cx={85} cy={85} r={RING_R} stroke="rgba(255,255,255,0.2)" strokeWidth={12} fill="none" />
              {/* Fill */}
              <Circle
                cx={85} cy={85} r={RING_R}
                stroke="rgba(255,255,255,0.95)"
                strokeWidth={12} fill="none"
                strokeDasharray={RING_C}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-90 85 85)"
              />
            </Svg>
            <View style={s.ringCenter}>
              <Footprints size={22} color="rgba(255,255,255,0.8)" strokeWidth={2} />
              <Text style={[s.ringSteps, { fontFamily: fonts.black }]}>
                {metrics.steps.toLocaleString()}
              </Text>
              <Text style={[s.ringGoal, { fontFamily: fonts.regular }]}>
                / {DAILY_STEP_GOAL.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={s.heroStats}>
            {[
              { icon: Activity, label: 'Khoảng cách', value: formatDistance(metrics.distance_m) },
              { icon: Flame,    label: 'Calories',     value: `${metrics.calories_active} kcal` },
              { icon: Clock,    label: 'Vận động',     value: `${metrics.active_minutes} min` },
            ].map(({ icon: Icon, label, value }) => (
              <View key={label} style={s.heroStat}>
                <Icon size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                <Text style={[s.heroStatValue, { fontFamily: fonts.bold }]}>{value}</Text>
                <Text style={[s.heroStatLabel, { fontFamily: fonts.regular }]}>{label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Active Zone Minutes ── */}
        <View style={[s.azmCard, { backgroundColor: colors.surface }]}>
          <View style={s.azmHeader}>
            <View style={[s.azmIcon, { backgroundColor: colors.secondary + '20' }]}>
              <Zap size={20} color={colors.secondary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.azmTitle, { color: colors.text.primary, fontFamily: fonts.bold }]}>
                Active Zone Minutes
              </Text>
              <Text style={[s.azmSub, { color: colors.text.muted, fontFamily: fonts.regular }]}>
                Mục tiêu tuần: {WEEKLY_AZM_TARGET} AZM
              </Text>
            </View>
            <Text style={[s.azmScore, { color: colors.secondary, fontFamily: fonts.black }]}>
              {metrics.azm}
            </Text>
          </View>

          {/* Zone bars */}
          {([
            { key: 'fat_burn', label: 'Fat Burn',  color: '#F59E0B', pts: 1 },
            { key: 'cardio',   label: 'Cardio',    color: '#EF4444', pts: 2 },
            { key: 'peak',     label: 'Peak',      color: '#8B5CF6', pts: 2 },
          ] as const).map(({ key, label, color, pts }) => {
            const mins = zones[key] ?? 0;
            const maxMins = 60;
            return (
              <View key={key} style={s.zoneRow}>
                <Text style={[s.zoneLabel, { color: colors.text.muted, fontFamily: fonts.regular }]}>
                  {label}
                </Text>
                <View style={[s.zoneTrack, { backgroundColor: colors.border }]}>
                  <View style={[s.zoneFill, { width: `${Math.min(100, (mins / maxMins) * 100)}%`, backgroundColor: color }]} />
                </View>
                <Text style={[s.zoneMins, { color: colors.text.secondary, fontFamily: fonts.semibold }]}>
                  {mins}m
                </Text>
                <Text style={[s.zonePts, { color, fontFamily: fonts.bold }]}>
                  ×{pts}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── HR stat card ── */}
        <View style={[s.hrCard, { backgroundColor: colors.surface }]}>
          <Heart size={18} color="#EF4444" strokeWidth={2} fill="#EF4444" />
          <Text style={[s.hrTitle, { color: colors.text.primary, fontFamily: fonts.bold }]}>Heart Rate</Text>
          <View style={s.hrStats}>
            {[
              { label: 'Nghỉ', value: '62', color: colors.secondary },
              { label: 'TB',   value: '78', color: colors.text.secondary },
              { label: 'Max',  value: '142', color: '#EF4444' },
            ].map(({ label, value, color }) => (
              <View key={label} style={s.hrStat}>
                <Text style={[s.hrValue, { color, fontFamily: fonts.black }]}>{value}</Text>
                <Text style={[s.hrLabel, { color: colors.text.muted, fontFamily: fonts.regular }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Activity history ── */}
        <Text style={[s.sectionTitle, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          Hôm nay
        </Text>
        {MOCK_HISTORY.map(({ type, duration, calories, time, color }) => (
          <TouchableOpacity
            key={type + time}
            activeOpacity={0.8}
            style={[s.historyRow, { backgroundColor: colors.surface }]}
          >
            <View style={[s.historyIcon, { backgroundColor: color + '18' }]}>
              <TrendingUp size={18} color={color} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.historyType, { color: colors.text.primary, fontFamily: fonts.semibold }]}>{type}</Text>
              <Text style={[s.historyMeta, { color: colors.text.muted, fontFamily: fonts.regular }]}>
                {duration} phút · {calories} kcal
              </Text>
            </View>
            <Text style={[s.historyTime, { color: colors.text.muted, fontFamily: fonts.regular }]}>{time}</Text>
            <ChevronRight size={16} color={colors.text.muted} strokeWidth={2} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: 20, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 26 },
  sub: { fontSize: 12, marginTop: 2 },
  refreshBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  heroCard: {
    padding: 20, alignItems: 'center', gap: 16,
    shadowColor: '#C1274A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  ringWrap: { position: 'relative', width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', gap: 2 },
  ringSteps: { color: '#FFF', fontSize: 28, marginTop: 2 },
  ringGoal: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  heroStat: { alignItems: 'center', gap: 3 },
  heroStatValue: { color: '#FFF', fontSize: 15 },
  heroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  azmCard: { borderRadius: 20, padding: 18, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  azmHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  azmIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  azmTitle: { fontSize: 15 },
  azmSub: { fontSize: 12, marginTop: 2 },
  azmScore: { fontSize: 28 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneLabel: { fontSize: 12, width: 64 },
  zoneTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  zoneFill: { height: '100%', borderRadius: 3 },
  zoneMins: { fontSize: 12, width: 28, textAlign: 'right' },
  zonePts: { fontSize: 11, width: 22 },
  hrCard: { borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  hrTitle: { fontSize: 15, flex: 1 },
  hrStats: { flexDirection: 'row', gap: 16 },
  hrStat: { alignItems: 'center', gap: 2 },
  hrValue: { fontSize: 18 },
  hrLabel: { fontSize: 11 },
  sectionTitle: { fontSize: 17, marginTop: 4 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  historyIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  historyType: { fontSize: 14 },
  historyMeta: { fontSize: 12, marginTop: 2 },
  historyTime: { fontSize: 12 },
});

