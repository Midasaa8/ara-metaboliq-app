/**
 * PART:   OCRCorrection — inline editable fields for each lab result row
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  28s — Medical OCR Service
 * TASK:   TextInput per row value (correctable), Save + Discard buttons
 * SCOPE:  IN: LabResult[] + onSave callback
 *         OUT: corrected LabResult[] back to useMedicalOCR
 */

import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { LabResult } from '@/services/api/ocrAPI';

interface Props {
  results: LabResult[];
  onSave: (corrected: LabResult[]) => void;
  onDiscard: () => void;
}

export function OCRCorrection({ results, onSave, onDiscard }: Props) {
  const { colors, fonts } = useTheme();
  const [edited, setEdited] = useState<LabResult[]>(results.map((r) => ({ ...r })));

  const updateField = useCallback((idx: number, field: 'value' | 'unit', val: string) => {
    setEdited((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  }, []);

  return (
    <View style={s.root}>
      <Text style={[s.title, { color: colors.text.primary, fontFamily: fonts.bold }]}>
        Chỉnh sửa kết quả OCR
      </Text>
      <Text style={[s.sub, { color: colors.text.muted, fontFamily: fonts.regular }]}>
        Sửa giá trị hoặc đơn vị nếu OCR nhận diện sai
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} style={s.scroll}>
        {edited.map((row, idx) => (
          <View key={`${row.test}-${idx}`} style={[s.editRow, { borderBottomColor: colors.border }]}>
            <Text style={[s.testLabel, { color: colors.text.secondary, fontFamily: fonts.semibold }]}>
              {row.test}
            </Text>
            <View style={s.inputGroup}>
              <TextInput
                style={[s.input, { backgroundColor: colors.surface, color: colors.text.primary, borderColor: colors.border, fontFamily: fonts.regular, flex: 1.2 }]}
                value={row.value}
                onChangeText={(v) => updateField(idx, 'value', v)}
                placeholder="Giá trị"
                placeholderTextColor={colors.text.muted}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[s.input, { backgroundColor: colors.surface, color: colors.text.primary, borderColor: colors.border, fontFamily: fonts.regular, flex: 0.7 }]}
                value={row.unit}
                onChangeText={(v) => updateField(idx, 'unit', v)}
                placeholder="Đơn vị"
                placeholderTextColor={colors.text.muted}
              />
              <Text style={[s.rangeHint, { color: colors.text.muted, fontFamily: fonts.regular }]}>
                TC: {row.normal_range}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={s.actions}>
        <TouchableOpacity style={[s.btn, s.discardBtn, { borderColor: colors.border }]} onPress={onDiscard}>
          <X size={18} color={colors.text.secondary} strokeWidth={2.5} />
          <Text style={[s.btnTxt, { color: colors.text.secondary, fontFamily: fonts.semibold }]}>Huỷ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.saveBtn, { backgroundColor: colors.primary }]} onPress={() => onSave(edited)}>
          <Check size={18} color="#FFF" strokeWidth={2.5} />
          <Text style={[s.btnTxt, { color: '#FFF', fontFamily: fonts.bold }]}>Lưu chỉnh sửa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 12 },
  title: { fontSize: 16 },
  sub: { fontSize: 13 },
  scroll: { maxHeight: 360 },
  editRow: { paddingVertical: 12, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  testLabel: { fontSize: 13 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { height: 38, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, fontSize: 14 },
  rangeHint: { fontSize: 11, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 24 },
  discardBtn: { borderWidth: 1 },
  saveBtn: {},
  btnTxt: { fontSize: 14 },
});
