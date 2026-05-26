/**
 * PART:   LabHistory — past scan gallery sorted by date
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  28s — Medical OCR Service
 * TASK:   Card list of LabScan history — date, count, abnormal count, tap to view
 * SCOPE:  IN: history from useMedicalOCR
 *         OUT: setActiveScan → parent navigate to result view
 */

import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { FileText, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { LabScan } from '@/services/ocr/MedicalOCRService';

interface Props {
  history: LabScan[];
  onSelect: (scan: LabScan) => void;
}

function ScanCard({ scan, onSelect }: { scan: LabScan; onSelect: (s: LabScan) => void }) {
  const { colors, fonts } = useTheme();
  const abnormal = scan.results.filter((r) => r.status === 'abnormal').length;
  const borderline = scan.results.filter((r) => r.status === 'borderline').length;
  const date = new Date(scan.scanned_at);

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onSelect(scan)}
      activeOpacity={0.7}
    >
      <View style={[s.iconWrap, { backgroundColor: colors.surfaceElevated }]}>
        <FileText size={22} color={colors.primary} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[s.dateText, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          {date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          {' · '}
          {date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={[s.countText, { color: colors.text.secondary, fontFamily: fonts.regular }]}>
          {scan.results.length} chỉ số
          {scan.source === 'image' ? ' · 📷 ảnh' : ' · 📝 văn bản'}
        </Text>
        {(abnormal > 0 || borderline > 0) && (
          <View style={s.flagRow}>
            {abnormal > 0 && (
              <View style={[s.flagBadge, { backgroundColor: '#EF444420' }]}>
                <AlertTriangle size={11} color="#EF4444" strokeWidth={2} />
                <Text style={[s.flagText, { color: '#EF4444', fontFamily: fonts.semibold }]}>
                  {abnormal} bất thường
                </Text>
              </View>
            )}
            {borderline > 0 && (
              <View style={[s.flagBadge, { backgroundColor: '#F59E0B20' }]}>
                <Text style={[s.flagText, { color: '#F59E0B', fontFamily: fonts.semibold }]}>
                  {borderline} cần chú ý
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
      <ChevronRight size={18} color={colors.text.muted} strokeWidth={2} />
    </TouchableOpacity>
  );
}

export function LabHistory({ history, onSelect }: Props) {
  const { colors, fonts } = useTheme();

  if (!history.length) {
    return (
      <View style={[s.empty, { backgroundColor: colors.surfaceElevated, borderRadius: 14 }]}>
        <FileText size={32} color={colors.text.muted} strokeWidth={1.5} />
        <Text style={[s.emptyText, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          Chưa có kết quả xét nghiệm nào
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ScanCard scan={item} onSelect={onSelect} />}
      contentContainerStyle={{ gap: 10 }}
      scrollEnabled={false}
    />
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: 14 },
  countText: { fontSize: 12 },
  flagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  flagBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  flagText: { fontSize: 11 },
  empty: { height: 100, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 13 },
});
