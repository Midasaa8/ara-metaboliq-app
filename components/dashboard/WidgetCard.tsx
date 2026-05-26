/**
 * PART:   WidgetCard — single Bento Grid widget container with size variants
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  35s — Dashboard Customization
 * TASK:   Render correct size based on WidgetSize, edit mode jiggle indicator
 * SCOPE:  IN: WidgetConfig + children content
 *         OUT: none
 */

import { View, Text, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { WidgetSize } from '@/store/dashboardStore';

interface Props {
  id: string;
  label: string;
  emoji: string;
  size: WidgetSize;
  editMode: boolean;
  columns: number;
  children?: React.ReactNode;
}

function getSpan(size: WidgetSize, cols: number): { colSpan: number; rowSpan: number } {
  switch (size) {
    case '4x1': return { colSpan: cols, rowSpan: 1 };
    case '2x2': return { colSpan: Math.min(2, cols), rowSpan: 2 };
    case '2x1': return { colSpan: Math.min(2, cols), rowSpan: 1 };
    case '1x1': return { colSpan: 1, rowSpan: 1 };
  }
}

export function WidgetCard({ id, label, emoji, size, editMode, columns, children }: Props) {
  const { colors, fonts } = useTheme();
  const { width } = useWindowDimensions();
  const gap = 10;
  const padding = 16;
  const gridWidth = width - padding * 2;
  const colWidth = (gridWidth - gap * (columns - 1)) / columns;
  const { colSpan, rowSpan } = getSpan(size, columns);
  const cardW = colWidth * colSpan + gap * (colSpan - 1);
  const cardH = rowSpan === 2 ? 180 : 88;

  return (
    <View style={[s.card, {
      width: cardW,
      height: cardH,
      backgroundColor: colors.surface,
      borderColor: editMode ? colors.primary + '60' : 'transparent',
    }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.emoji}>{emoji}</Text>
        <Text style={[s.label, { color: colors.text.muted, fontFamily: fonts.semibold }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {/* Content area */}
      <View style={s.content}>
        {children}
      </View>
      {editMode && <View style={[s.editBadge, { backgroundColor: colors.primary }]}>
        <Text style={s.editIcon}>≡</Text>
      </View>}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 12, borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  emoji: { fontSize: 14 },
  label: { fontSize: 11 },
  content: { flex: 1 },
  editBadge: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  editIcon: { color: '#FFF', fontSize: 12, fontWeight: '800' },
});
