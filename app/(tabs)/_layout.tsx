/**
 * PART:   Tab Navigator — Floating Oval Pill + Settings Modal
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  UI Redesign v2 — Reference Design
 * READS:  constants/theme.ts, hooks/useTheme.tsx
 * TASK:   Custom tab bar: horizontal oval pill, circular icon buttons,
 *         active = teal-green filled circle, settings circle opens dark-mode modal.
 *         Header right: theme toggle (Moon/Sun) + settings gear (circle buttons).
 * SCOPE:  Layout shell only — no business logic
 */

import { useState } from 'react';
import { Tabs } from 'expo-router';
import {
  Home, Mic2, Dumbbell, Activity, Wallet,
  Settings, Sun, Moon, X, Check
} from 'lucide-react-native';
import {
  View, TouchableOpacity, Text, Modal,
  StyleSheet, Switch, Platform, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

// ── Tab configuration ────────────────────────────────────────────────────────
const TABS = [
  { name: 'index',    icon: Home,     label: 'Home' },
  { name: 'voice',    icon: Mic2,     label: 'Voice' },
  { name: 'exercise', icon: Dumbbell, label: 'Active' },
  { name: 'twin',     icon: Activity, label: 'Twin' },
  { name: 'fintech',  icon: Wallet,   label: 'Finance' },
] as const;

// ── Header right buttons (theme toggle + settings) ──────────────────────────
function HeaderRight() {
  const { isDark, toggleMode, colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 18, gap: 10, paddingTop: Platform.OS === 'android' ? 8 : 0 }}>
      {/* Theme toggle button — circle */}
      <TouchableOpacity
        onPress={toggleMode}
        activeOpacity={0.75}
        style={[hdr.btn, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface, shadowColor: colors.text.primary }]}
      >
        {isDark
          ? <Sun size={17} color={colors.accent} strokeWidth={2.2} />
          : <Moon size={17} color={colors.text.secondary} strokeWidth={2.2} />}
      </TouchableOpacity>
    </View>
  );
}

const hdr = StyleSheet.create({
  btn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
});

// ── Custom Tab Bar — Oval Pill ───────────────────────────────────────────────
function CustomTabBar({ state, navigation }: any) {
  const { colors, isDark, toggleMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Exclude hidden 'nutrition' screen from visible tabs
  const visibleRoutes = state.routes.filter((r: any) => r.name !== 'nutrition');

  return (
    <>
      {/* ── Floating Pill ────────────────────────────────────────────────── */}
      <View style={[
        s.pillWrap,
        { bottom: Math.max(insets.bottom, 12) + 8 },
      ]}>
        <View style={[
          s.pill,
          {
            backgroundColor: isDark ? colors.surface : 'rgba(255,255,255,0.96)',
            shadowColor: isDark ? '#000' : '#1A2535',
          },
        ]}>
          {/* Navigation circles */}
          {visibleRoutes.map((route: any, idx: number) => {
            const isFocused = state.index === state.routes.indexOf(route);
            const tab = TABS[idx];
            if (!tab) return null;
            const Icon = tab.icon;

            return (
              <TouchableOpacity
                key={route.key}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                activeOpacity={0.75}
                style={s.circleWrap}
              >
                <View style={[
                  s.circle,
                  isFocused
                    ? { backgroundColor: colors.secondary, shadowColor: colors.secondary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }
                    : { backgroundColor: 'transparent' },
                ]}>
                  <Icon
                    size={21}
                    color={isFocused ? '#FFFFFF' : colors.text.muted}
                    strokeWidth={isFocused ? 2.5 : 2}
                  />
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Thin divider */}
          <View style={[s.divider, { backgroundColor: colors.border }]} />

          {/* Settings circle */}
          <TouchableOpacity
            onPress={() => setSettingsVisible(true)}
            activeOpacity={0.75}
            style={s.circleWrap}
          >
            <View style={[s.circle, { backgroundColor: colors.primary + '18' }]}>
              <Settings size={19} color={colors.primary} strokeWidth={2} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Settings Bottom Sheet Modal ──────────────────────────────────── */}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <Pressable style={m.overlay} onPress={() => setSettingsVisible(false)}>
          <Pressable
            style={[m.sheet, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={[m.handle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={m.header}>
              <Text style={[m.title, { color: colors.text.primary, fontFamily: 'Nunito_700Bold' }]}>
                Cài đặt
              </Text>
              <TouchableOpacity
                onPress={() => setSettingsVisible(false)}
                style={[m.closeBtn, { backgroundColor: colors.surfaceElevated }]}
              >
                <X size={18} color={colors.text.muted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Section: Giao diện */}
            <Text style={[m.sectionLabel, { color: colors.text.muted, fontFamily: 'Nunito_600SemiBold' }]}>
              GIAO DIỆN
            </Text>

            {/* Dark mode row */}
            <View style={[m.row, { borderColor: colors.border }]}>
              <View style={m.rowLeft}>
                <View style={[m.iconBox, { backgroundColor: isDark ? colors.primary + '20' : colors.accent + '20' }]}>
                  {isDark
                    ? <Moon size={18} color={colors.primary} strokeWidth={2} />
                    : <Sun size={18} color={colors.accent} strokeWidth={2} />}
                </View>
                <View>
                  <Text style={[m.rowLabel, { color: colors.text.primary, fontFamily: 'Nunito_600SemiBold' }]}>
                    {isDark ? 'Giao diện tối' : 'Giao diện sáng'}
                  </Text>
                  <Text style={[m.rowSub, { color: colors.text.muted, fontFamily: 'Nunito_400Regular' }]}>
                    {isDark ? 'Đang dùng chế độ tối' : 'Đang dùng chế độ sáng'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleMode}
                trackColor={{ false: colors.border, true: colors.secondary }}
                thumbColor={isDark ? '#FFFFFF' : '#FFFFFF'}
                ios_backgroundColor={colors.border}
              />
            </View>

            {/* Theme mode options */}
            <View style={m.modeRow}>
              {(['light', 'dark'] as const).map((mode) => {
                const active = (isDark && mode === 'dark') || (!isDark && mode === 'light');
                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => {
                      if (mode === 'dark' && !isDark) toggleMode();
                      if (mode === 'light' && isDark) toggleMode();
                    }}
                    style={[
                      m.modeChip,
                      {
                        backgroundColor: active ? colors.secondary : colors.surfaceElevated,
                        borderColor: active ? colors.secondary : colors.border,
                      },
                    ]}
                  >
                    {mode === 'light'
                      ? <Sun size={14} color={active ? '#FFF' : colors.text.muted} strokeWidth={2} />
                      : <Moon size={14} color={active ? '#FFF' : colors.text.muted} strokeWidth={2} />}
                    <Text style={[m.modeLabel, { color: active ? '#FFF' : colors.text.secondary, fontFamily: 'Nunito_600SemiBold' }]}>
                      {mode === 'light' ? 'Sáng' : 'Tối'}
                    </Text>
                    {active && <Check size={13} color="#FFF" strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ── Root Layout ──────────────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: '',
        headerStyle: { borderBottomWidth: 0 },
        headerRight: () => <HeaderRight />,
        lazy: true,
      }}
    >
      {TABS.map(({ name, label }) => (
        <Tabs.Screen key={name} name={name} options={{ title: label }} />
      ))}
      <Tabs.Screen name="nutrition" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  pillWrap: {
    position: 'absolute',
    left: '6%',
    right: '6%',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    borderRadius: 9999,
    height: 60,
    width: '100%',
    paddingHorizontal: 6,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  circleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  circle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 2,
  },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 20,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '700' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1,
    marginBottom: 12, textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 2,
    borderBottomWidth: 1,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  modeRow: {
    flexDirection: 'row', gap: 10, marginTop: 16,
  },
  modeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 14, borderWidth: 1.5,
  },
  modeLabel: { fontSize: 13, fontWeight: '600' },
});
