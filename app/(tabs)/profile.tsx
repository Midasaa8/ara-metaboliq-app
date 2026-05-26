/**
 * PART:   Profile Tab — Health history, achievements, settings entry
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  Phase 20s — Navigation Refactor (placeholder for Phase 33s)
 * TASK:   Profile screen: user stats, achievements strip, settings rows, dark mode toggle.
 *         Full settings in Phase 33s. Full achievements in Phase 31s.
 */

import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User, Trophy, Moon, Sun, ChevronRight,
  Bell, Shield, HelpCircle, LogOut,
  Mic2, Activity, Flame, Droplets,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useUserStore } from '@/store/userStore';
import { useHealthStore } from '@/store/healthStore';

const SETTINGS_ROWS = [
  { icon: Bell,       label: 'Thông báo',        sub: 'Nhắc nhở & cảnh báo',    color: '#F59E0B' },
  { icon: Shield,     label: 'Quyền riêng tư',   sub: 'Dữ liệu & bảo mật',     color: '#4ECFB5' },
  { icon: HelpCircle, label: 'Trợ giúp',          sub: 'FAQ & liên hệ hỗ trợ',  color: '#3B82F6' },
  { icon: LogOut,     label: 'Đăng xuất',         sub: '',                       color: '#EF4444' },
] as const;

const ACHIEVEMENT_BADGES = [
  { icon: Flame,    label: '7-Day Streak',  color: '#F59E0B', done: true },
  { icon: Mic2,     label: 'Voice Champ',   color: '#C1274A', done: true },
  { icon: Activity, label: '10K Steps',     color: '#4ECFB5', done: false },
  { icon: Droplets, label: 'Hydration+',    color: '#3B82F6', done: false },
];

export default function ProfileScreen() {
  const { colors, fonts, spacing, isDark, toggleMode } = useTheme();
  const pad = spacing.lg;

  const profile = useUserStore((s) => s.profile);
  const streakDays = useHealthStore((s) => s.streakDays);
  const firstName = profile?.fullName?.split(' ')[0] ?? 'User';

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: 110, paddingHorizontal: pad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar + Name ── */}
        <View style={[s.avatarCard, { backgroundColor: colors.surface }]}>
          <View style={[s.avatar, { backgroundColor: colors.primary + '20' }]}>
            <User size={36} color={colors.primary} strokeWidth={1.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.name, { color: colors.text.primary, fontFamily: fonts.black }]}>
              {profile?.fullName ?? 'Người dùng'}
            </Text>
            <Text style={[s.email, { color: colors.text.muted, fontFamily: fonts.regular }]}>
              {profile?.email ?? 'Chưa đăng nhập'}
            </Text>
          </View>
          <TouchableOpacity style={[s.editBtn, { backgroundColor: colors.surfaceElevated }]}>
            <ChevronRight size={18} color={colors.text.muted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* ── Stats row ── */}
        <View style={s.statsRow}>
          {[
            { label: 'Streak', value: `${streakDays ?? 0}`, unit: 'ngày', color: colors.health.warning },
            { label: 'Check-ins', value: '12', unit: 'voice', color: colors.primary },
            { label: 'Health', value: '74', unit: '/100', color: colors.secondary },
          ].map(({ label, value, unit, color }) => (
            <View key={label} style={[s.statCard, { backgroundColor: colors.surface }]}>
              <Text style={[s.statValue, { color, fontFamily: fonts.black }]}>{value}</Text>
              <Text style={[s.statUnit, { color: colors.text.muted, fontFamily: fonts.regular }]}>{unit}</Text>
              <Text style={[s.statLabel, { color: colors.text.muted, fontFamily: fonts.semibold }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Achievements ── */}
        <Text style={[s.sectionTitle, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          Thành tích
        </Text>
        <View style={s.badgesRow}>
          {ACHIEVEMENT_BADGES.map(({ icon: Icon, label, color, done }) => (
            <View key={label} style={[s.badge, { backgroundColor: colors.surface, opacity: done ? 1 : 0.4 }]}>
              <View style={[s.badgeIcon, { backgroundColor: done ? color + '20' : colors.border }]}>
                <Icon size={20} color={done ? color : colors.text.muted} strokeWidth={2} />
              </View>
              <Text style={[s.badgeLabel, { color: colors.text.muted, fontFamily: fonts.semibold }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Appearance ── */}
        <Text style={[s.sectionTitle, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          Giao diện
        </Text>
        <View style={[s.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.settingIcon, { backgroundColor: isDark ? colors.primary + '20' : colors.accent + '20' }]}>
            {isDark
              ? <Moon size={18} color={colors.primary} strokeWidth={2} />
              : <Sun size={18} color={colors.accent} strokeWidth={2} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.settingLabel, { color: colors.text.primary, fontFamily: fonts.semibold }]}>
              {isDark ? 'Chế độ tối' : 'Chế độ sáng'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleMode}
            trackColor={{ false: colors.border, true: colors.secondary }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.border}
          />
        </View>

        {/* ── Settings list ── */}
        <Text style={[s.sectionTitle, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          Cài đặt
        </Text>
        <View style={[s.settingsList, { backgroundColor: colors.surface }]}>
          {SETTINGS_ROWS.map(({ icon: Icon, label, sub, color }, idx) => (
            <TouchableOpacity
              key={label}
              activeOpacity={0.7}
              style={[
                s.settingRow,
                { borderColor: colors.border },
                idx < SETTINGS_ROWS.length - 1 && s.settingBorder,
              ]}
            >
              <View style={[s.settingIcon, { backgroundColor: color + '18' }]}>
                <Icon size={18} color={color} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.settingLabel, { color: colors.text.primary, fontFamily: fonts.semibold }]}>
                  {label}
                </Text>
                {!!sub && (
                  <Text style={[s.settingSub, { color: colors.text.muted, fontFamily: fonts.regular }]}>
                    {sub}
                  </Text>
                )}
              </View>
              <ChevronRight size={17} color={colors.text.muted} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Version */}
        <Text style={[s.version, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          ARA MetaboliQ v0.1.0 · Wave 1 build
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: 20 },
  avatarCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 20, marginBottom: 2 },
  email: { fontSize: 13 },
  editBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontSize: 22 },
  statUnit: { fontSize: 11 },
  statLabel: { fontSize: 11 },
  sectionTitle: { fontSize: 17, marginBottom: 12, marginTop: 4 },
  badgesRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  badge: {
    flex: 1, borderRadius: 14, padding: 12,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  badgeIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeLabel: { fontSize: 10, textAlign: 'center' },
  settingsList: {
    borderRadius: 16, marginBottom: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  settingBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  settingIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  settingLabel: { fontSize: 15 },
  settingSub: { fontSize: 12, marginTop: 1 },
  version: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});
