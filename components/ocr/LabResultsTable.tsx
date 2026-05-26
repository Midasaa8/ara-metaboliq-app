/**
 * PART:   LabResultsTable — display parsed lab results with status colors
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  28s — Medical OCR Service
 * TASK:   Table rows: test | value±unit | normal range | status badge
 *         Low-confidence rows (< 0.90) show ⚠ indicator
 * SCOPE:  IN: LabResult[] from ocrAPI
 *         OUT: none (display only; edit handled by OCRCorrection)
 */

import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { LabResult } from '@/services/api/ocrAPI';

interface Props {
  results: LabResult[];
}

const STATUS_COLOR: Record<LabResult['status'], string> = {
  normal:     '#4ECFB5',
  borderline: '#F59E0B',
  abnormal:   '#EF4444',
};

function ResultRow({ result }: { result: LabResult }) {
  const { colors, fonts } = useTheme();
  const statusColor = STATUS_COLOR[result.status];
  const lowConfidence = result.confidence < 0.9;

  return (
    <View style={[s.row, { borderBottomColor: colors.border }]}>
      <View style={s.colTest}>
        <Text style={[s.testName, { color: colors.text.primary, fontFamily: fonts.semibold }]}>
          {result.test}
        </Text>
        {lowConfidence && (
          <View style={s.confRow}>
            <AlertTriangle size={11} color={colors.health.warning} strokeWidth={2} />
            <Text style={[s.confText, { color: colors.health.warning, fontFamily: fonts.regular }]}>
              {Math.round(result.confidence * 100)}%
            </Text>
          </View>
        )}
      </View>
      <View style={s.colValue}>
        <Text style={[s.value, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          {result.value}
        </Text>
        <Text style={[s.unit, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          {result.unit}
        </Text>
      </View>
      <View style={s.colRange}>
        <Text style={[s.range, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          {result.normal_range}
        </Text>
      </View>
      <View style={[s.badge, { backgroundColor: statusColor + '22' }]}>
        <Text style={[s.badgeText, { color: statusColor, fontFamily: fonts.bold }]}>
          {result.status_display}
        </Text>
      </View>
    </View>
  );
}

export function LabResultsTable({ results }: Props) {
  const { colors, fonts } = useTheme();
  if (!results.length) return null;

  const abnormal = results.filter((r) => r.status === 'abnormal');

  return (
    <View style={{ gap: 8 }}>
      {abnormal.length > 0 && (
        <View style={[s.alert, { backgroundColor: '#EF444418', borderColor: '#EF444430' }]}>
          <AlertTriangle size={14} color="#EF4444" strokeWidth={2} />
          <Text style={[s.alertText, { color: '#EF4444', fontFamily: fonts.semibold }]}>
            {abnormal.length} chỉ số bất thường — hãy tham khảo bác sĩ
          </Text>
        </View>
      )}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        {['Chỉ số', 'Kết quả', 'Tham chiếu', 'Trạng thái'].map((h) => (
          <Text key={h} style={[s.headerCell, { color: colors.text.muted, fontFamily: fonts.semibold }]}>{h}</Text>
        ))}
      </View>
      {results.map((r, i) => <ResultRow key={`${r.test}-${i}`} result={r} />)}
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, gap: 4 },
  headerCell: { flex: 1, fontSize: 11 },
  row: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: 'center', gap: 4 },
  colTest: { flex: 1.4, gap: 3 },
  colValue: { flex: 0.8 },
  colRange: { flex: 1 },
  testName: { fontSize: 13 },
  value: { fontSize: 14 },
  unit: { fontSize: 11 },
  range: { fontSize: 11 },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  confText: { fontSize: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  alertText: { fontSize: 13 },
});
