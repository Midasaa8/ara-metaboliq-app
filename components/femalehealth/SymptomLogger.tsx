/**
 * PART:   SymptomLogger — symptom chip selector for a given date
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  32s — Female Health UI
 * TASK:   Multi-select symptom chips + notes input, save to FemaleHealthService
 * SCOPE:  IN: useFemaleHealth.logSymptomsForDate
 *         OUT: none
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { SymptomType } from '@/services/health/FemaleHealthService';

interface Props {
  date: string;
  initialSymptoms?: SymptomType[];
  initialNotes?: string;
  onSave: (date: string, symptoms: SymptomType[], notes?: string) => Promise<void>;
  onClose?: () => void;
}

const SYMPTOM_CONFIG: { type: SymptomType; emoji: string; label: string }[] = [
  { type: 'cramps',   emoji: '😣', label: 'Đau bụng' },
  { type: 'mood',     emoji: '🌊', label: 'Tâm trạng thay đổi' },
  { type: 'energy',   emoji: '⚡', label: 'Mệt mỏi' },
  { type: 'bloating', emoji: '🎈', label: 'Đầy bụng' },
  { type: 'headache', emoji: '🤯', label: 'Đau đầu' },
];

export function SymptomLogger({ date, initialSymptoms = [], initialNotes = '', onSave, onClose }: Props) {
  const { colors, fonts } = useTheme();
  const [selected, setSelected] = useState<SymptomType[]>(initialSymptoms);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  function toggle(type: SymptomType) {
    setSelected((prev) =>
      prev.includes(type) ? prev.filter((s) => s !== type) : [...prev, type]
    );
  }

  async function handleSave() {
    setSaving(true);
    await onSave(date, selected, notes || undefined);
    setSaving(false);
    onClose?.();
  }

  const displayDate = new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <View style={s.root}>
      <Text style={[s.title, { color: colors.text.primary, fontFamily: fonts.bold }]}>
        Ghi triệu chứng — {displayDate}
      </Text>

      <View style={s.chips}>
        {SYMPTOM_CONFIG.map(({ type, emoji, label }) => {
          const active = selected.includes(type);
          return (
            <TouchableOpacity
              key={type}
              onPress={() => toggle(type)}
              style={[s.chip, {
                backgroundColor: active ? colors.primary + '20' : colors.surfaceElevated,
                borderColor: active ? colors.primary : colors.border,
              }]}
            >
              <Text style={s.chipEmoji}>{emoji}</Text>
              <Text style={[s.chipLabel, { color: active ? colors.primary : colors.text.secondary, fontFamily: active ? fonts.bold : fonts.regular }]}>
                {label}
              </Text>
              {active && <Check size={13} color={colors.primary} strokeWidth={2.5} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        style={[s.notes, { backgroundColor: colors.surfaceElevated, color: colors.text.primary, borderColor: colors.border, fontFamily: fonts.regular }]}
        placeholder="Ghi chú thêm (không bắt buộc)..."
        placeholderTextColor={colors.text.muted}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[s.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
        onPress={handleSave}
        disabled={saving}
      >
        <Check size={18} color="#FFF" strokeWidth={2.5} />
        <Text style={[s.saveTxt, { fontFamily: fonts.bold }]}>Lưu</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 16 },
  title: { fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipEmoji: { fontSize: 16 },
  chipLabel: { fontSize: 13 },
  notes: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 13, minHeight: 70, textAlignVertical: 'top' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 24 },
  saveTxt: { color: '#FFF', fontSize: 15 },
});
