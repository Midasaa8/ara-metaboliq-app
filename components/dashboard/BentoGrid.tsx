/**
 * PART:   BentoGrid — renders visible widgets in responsive 2/4-col grid
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  35s — Dashboard Customization
 * TASK:   Map widget configs → WidgetCard components arranged with flexWrap
 * SCOPE:  IN: useDashboardLayout hook
 *         OUT: Renders on main tab screen
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { WidgetCard } from './WidgetCard';
import { useTheme } from '@/hooks/useTheme';

export function BentoGrid() {
  const { visibleWidgets, columns, editMode, setEditMode } = useDashboardLayout();
  const { colors, fonts } = useTheme();

  return (
    <View style={s.container}>
      {/* Edit toggle */}
      <View style={s.toolbar}>
        <Text style={[s.title, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          Dashboard
        </Text>
        <Pressable onPress={() => setEditMode(!editMode)} style={[s.editBtn, { backgroundColor: editMode ? colors.primary : colors.surface }]}>
          <Text style={{ color: editMode ? '#FFF' : colors.text.muted, fontSize: 12, fontFamily: fonts.semibold }}>
            {editMode ? 'Xong' : 'Tuỳ chỉnh'}
          </Text>
        </Pressable>
      </View>

      {/* Grid */}
      <View style={s.grid}>
        {visibleWidgets.map((w) => (
          <WidgetCard
            key={w.id}
            id={w.id}
            label={w.label}
            emoji={w.emoji}
            size={w.size}
            editMode={editMode}
            columns={columns}
          >
            <Text style={{ color: colors.text.muted, fontSize: 10 }}>
              {w.id} widget
            </Text>
          </WidgetCard>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 20 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
