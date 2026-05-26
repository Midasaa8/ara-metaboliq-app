/**
 * PART:   EditMode — widget visibility toggler in edit mode overlay
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  35s — Dashboard Customization
 * TASK:   Show all widgets with checkboxes to toggle visibility
 * SCOPE:  IN: useDashboardLayout
 *         OUT: none (renders as modal/overlay)
 */

import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  onClose: () => void;
}

export function EditMode({ onClose }: Props) {
  const { allWidgets, toggleWidget, reorder } = useDashboardLayout();
  const { colors, fonts } = useTheme();

  const moveUp = (idx: number) => { if (idx > 0) reorder(idx, idx - 1); };
  const moveDown = (idx: number) => { if (idx < allWidgets.length - 1) reorder(idx, idx + 1); };

  return (
    <View style={[s.overlay, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          Tuỳ chỉnh Dashboard
        </Text>
        <Pressable onPress={onClose} style={[s.doneBtn, { backgroundColor: colors.primary }]}>
          <Text style={{ color: '#FFF', fontFamily: fonts.semibold, fontSize: 13 }}>Xong</Text>
        </Pressable>
      </View>

      <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
        {allWidgets.map((w, idx) => (
          <View key={w.id} style={[s.row, { borderBottomColor: colors.border }]}>
            {/* Reorder buttons */}
            <View style={s.arrows}>
              <Pressable onPress={() => moveUp(idx)} disabled={w.pinned || idx === 0}>
                <Text style={[s.arrow, { color: w.pinned ? colors.text.muted + '40' : colors.text.muted }]}>▲</Text>
              </Pressable>
              <Pressable onPress={() => moveDown(idx)} disabled={w.pinned || idx === allWidgets.length - 1}>
                <Text style={[s.arrow, { color: w.pinned ? colors.text.muted + '40' : colors.text.muted }]}>▼</Text>
              </Pressable>
            </View>

            {/* Widget info */}
            <Text style={s.emoji}>{w.emoji}</Text>
            <View style={s.info}>
              <Text style={[s.label, { color: colors.text.primary, fontFamily: fonts.medium }]}>{w.label}</Text>
              <Text style={[s.size, { color: colors.text.muted }]}>{w.size}</Text>
            </View>

            {/* Toggle */}
            <Switch
              value={w.visible}
              onValueChange={() => toggleWidget(w.id)}
              disabled={w.pinned}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 18 },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  list: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5 },
  arrows: { marginRight: 10, gap: 2 },
  arrow: { fontSize: 12, textAlign: 'center' },
  emoji: { fontSize: 20, marginRight: 10 },
  info: { flex: 1 },
  label: { fontSize: 14 },
  size: { fontSize: 11, marginTop: 2 },
});
