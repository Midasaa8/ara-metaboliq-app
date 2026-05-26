/**
 * PART:   Tab Navigator — Fitbit 3-Tab + FAB Layout
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  Phase 20s — Navigation Refactor
 * READS:  constants/theme.ts, hooks/useTheme.tsx
 * TASK:   3 main tabs (Today, Discover, Profile) + center FAB (+) for quick log.
 *         Floating oval pill. Old screens (voice, exercise) accessible via FAB/nav.
 * SCOPE:  Layout shell only — no business logic
 */

import { useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import {
  Home, Compass, User,
  Plus, Mic2, Dumbbell, Salad, Droplets, Weight,
  X, Sun, Moon,
} from 'lucide-react-native';
import {
  View, TouchableOpacity, Text, Modal,
  StyleSheet, Pressable, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

// ── 3 visible tabs ───────────────────────────────────────────────────────────
const TABS = [
  { name: 'index',    icon: Home,    label: 'Today' },
  { name: 'discover', icon: Compass, label: 'Discover' },
  { name: 'profile',  icon: User,    label: 'Profile' },
] as const;

// ── FAB quick-log actions ────────────────────────────────────────────────────
const FAB_ACTIONS = [
  { icon: Mic2,     label: 'Voice Check-in', color: '#C1274A', route: '/voice' },
  { icon: Dumbbell, label: 'Log Exercise',   color: '#4ECFB5', route: '/exercise' },
  { icon: Salad,    label: 'Log Food',       color: '#F59E0B', route: '/nutrition' },
  { icon: Droplets, label: 'Log Water',      color: '#3B82F6', route: '/nutrition' },
  { icon: Weight,   label: 'Log Weight',     color: '#8B5CF6', route: '/nutrition' },
] as const;

// ── FAB Bottom Sheet ─────────────────────────────────────────────────────────
function FABSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const router = useRouter();

  function handleAction(route: string) {
    onClose();
    router.push(route as any);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={f.overlay} onPress={onClose}>
        <Pressable style={[f.sheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={[f.handle, { backgroundColor: colors.border }]} />
          <Text style={[f.title, { color: colors.text.primary }]}>Quick Log</Text>
          <View style={f.grid}>
            {FAB_ACTIONS.map(({ icon: Icon, label, color, route }) => (
              <TouchableOpacity
                key={label}
                onPress={() => handleAction(route)}
                activeOpacity={0.75}
                style={[f.actionBtn, { backgroundColor: colors.surfaceElevated }]}
              >
                <View style={[f.actionIcon, { backgroundColor: color + '20' }]}>
                  <Icon size={22} color={color} strokeWidth={2} />
                </View>
                <Text style={[f.actionLabel, { color: colors.text.secondary }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Custom Tab Bar — 3 tabs + FAB pill ──────────────────────────────────────
function CustomTabBar({ state, navigation }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [fabOpen, setFabOpen] = useState(false);

  // Only show 3 main tabs
  const visibleRoutes = state.routes.filter((r: any) =>
    TABS.some((t) => t.name === r.name)
  );

  return (
    <>
      <FABSheet visible={fabOpen} onClose={() => setFabOpen(false)} />

      {/* ── Floating Pill ──────────────────────────────────────────────── */}
      <View style={[s.pillWrap, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
        <View style={[
          s.pill,
          {
            backgroundColor: isDark ? colors.surface : 'rgba(255,255,255,0.96)',
            shadowColor: isDark ? '#000' : '#1A2535',
          },
        ]}>
          {/* Today + Discover tabs */}
          {visibleRoutes.slice(0, 2).map((route: any, idx: number) => {
            const isFocused = state.index === state.routes.indexOf(route);
            const Icon = TABS[idx].icon;
            return (
              <TouchableOpacity
                key={route.key}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
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
                  <Icon size={21} color={isFocused ? '#FFFFFF' : colors.text.muted} strokeWidth={isFocused ? 2.5 : 2} />
                </View>
              </TouchableOpacity>
            );
          })}

          {/* FAB center button */}
          <TouchableOpacity
            onPress={() => setFabOpen(true)}
            activeOpacity={0.85}
            style={s.fabWrap}
          >
            <View style={[s.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
              <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>

          {/* Profile tab */}
          {visibleRoutes.slice(2).map((route: any) => {
            const isFocused = state.index === state.routes.indexOf(route);
            const Icon = TABS[2].icon;
            return (
              <TouchableOpacity
                key={route.key}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
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
                  <Icon size={21} color={isFocused ? '#FFFFFF' : colors.text.muted} strokeWidth={isFocused ? 2.5 : 2} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );
}

// ── Root Layout ──────────────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
    >
      {TABS.map(({ name, label }) => (
        <Tabs.Screen key={name} name={name} options={{ title: label }} />
      ))}
      {/* Hidden routes — accessible via FAB navigation */}
      <Tabs.Screen name="voice"    options={{ href: null }} />
      <Tabs.Screen name="exercise" options={{ href: null }} />
      <Tabs.Screen name="nutrition" options={{ href: null }} />
      <Tabs.Screen name="twin"     options={{ href: null }} />
      <Tabs.Screen name="fintech"  options={{ href: null }} />
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
    borderRadius: 9999,
    height: 64,
    width: '100%',
    paddingHorizontal: 8,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  circleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabWrap: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
});

const f = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
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
  title: {
    fontSize: 18, fontFamily: 'Nunito_700Bold',
    marginBottom: 20, textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  actionBtn: {
    width: '30%',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 8,
  },
  actionIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11, fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
  },
});
