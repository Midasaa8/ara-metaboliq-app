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
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name:        string;
  title:       string;
  icon:        IoniconName;
  iconFocused: IoniconName;
}

const TABS: TabConfig[] = [
  { name: 'index',    title: 'Home',      icon: 'home-outline',    iconFocused: 'home' },
  { name: 'voice',    title: 'Voice AI',  icon: 'mic-outline',     iconFocused: 'mic' },
  { name: 'exercise', title: 'Exercise',  icon: 'fitness-outline', iconFocused: 'fitness' },
  { name: 'twin',     title: 'Twin',      icon: 'body-outline',    iconFocused: 'body' },
  { name: 'fintech',  title: 'Finance',   icon: 'wallet-outline',  iconFocused: 'wallet' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:    false,
        // Keep all tab screens mounted — prevents state loss when switching tabs
        unmountOnBlur:  false,
        lazy:           true,
        tabBarStyle: {
          backgroundColor:  colors.surface,   // Space Grey #1C1C1E
          borderTopColor:   colors.border,
          borderTopWidth:   0.5,
          elevation:        0,
          shadowOpacity:    0,
          height:           60,
          paddingBottom:    8,
        },
        tabBarActiveTintColor:   colors.primary,        // Signal Purple
        tabBarInactiveTintColor: colors.text.muted,     // Dim grey
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: '500',
          marginTop:  -2,
        },
      }}
    >
      {TABS.map(({ name, title, icon, iconFocused }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? iconFocused : icon}
                size={size ?? 22}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
