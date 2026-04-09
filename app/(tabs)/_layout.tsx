/**
 * PART:   Tab Navigator — bottom tab bar config
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  2 — Navigation & Tab Shell
 * READS:  AGENTS.md §7 File Structure, constants/theme.ts
 * TASK:   5-tab navigator with correct icons, dark theme, lazy loading
 * SCOPE:  IN: tab bar styling, icons, routing config
 *         OUT: screen content (Phase 3+)
 */

import { Tabs } from 'expo-router';
import {
  Home,
  Mic2,
  Dumbbell,
  Activity,
  Wallet,
  LucideIcon
} from 'lucide-react-native';
import { View, Platform } from 'react-native';
import { colors, spacing, radius, elevation, fonts } from '@/constants/theme';



interface TabConfig {
  name: string;
  title: string;
  icon: LucideIcon;
}

const TABS: TabConfig[] = [
  { name: 'index', title: 'Home', icon: Home },
  { name: 'voice', title: 'Voice AI', icon: Mic2 },
  { name: 'exercise', title: 'Active', icon: Dumbbell },
  { name: 'twin', title: 'Twin', icon: Activity },
  { name: 'fintech', title: 'Fintech', icon: Wallet },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          elevation: elevation.float.elevation,
          shadowColor: elevation.float.shadowColor,
          shadowOffset: elevation.float.shadowOffset,
          shadowOpacity: elevation.float.shadowOpacity,
          shadowRadius: elevation.float.shadowRadius,
          height: Platform.OS === 'ios' ? 88 : 68,
          position: 'absolute',
          bottom: spacing.md,
          left: spacing.lg,
          right: spacing.lg,
          borderRadius: radius.md,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: fonts.medium,
          fontWeight: '600',
        },
      }}
    >
      {TABS.map(({ name, title, icon: Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => (
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Icon
                  size={size ?? 24}
                  color={color}
                  strokeWidth={2}
                />
              </View>
            ),
          }}
        />
      ))}
      <Tabs.Screen
        name="nutrition"
        options={{ href: null, headerShown: false }}
      />
    </Tabs>
  );
}
