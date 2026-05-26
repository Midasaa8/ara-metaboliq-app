/**
 * PART:   PrivacySettings — data export, account deletion, sharing
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  33s — Settings Architecture
 * TASK:   Export JSON, delete all data, toggle sharing controls
 * SCOPE:  IN: SettingsService exportUserData/deleteAllData
 *         OUT: none
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
import { Download, Trash2, Share2, Shield } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { exportUserData, deleteAllData } from '@/services/settings/SettingsService';
import * as FileSystem from 'expo-file-system/build/legacy/FileSystem';

interface Props {
  shareWithFriends: boolean;
  analyticsEnabled: boolean;
  onSetShare: (v: boolean) => void;
  onSetAnalytics: (v: boolean) => void;
  onAccountDeleted: () => void;
}

export function PrivacySettings({ shareWithFriends, analyticsEnabled, onSetShare, onSetAnalytics, onAccountDeleted }: Props) {
  const { colors, fonts } = useTheme();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    const json = await exportUserData();
    const dir = FileSystem.cacheDirectory ?? '';
    const path = `${dir}ara_metaboliq_export.json`;
    await FileSystem.writeAsStringAsync(path, json);
    Alert.alert('Xuất dữ liệu thành công', `File đã lưu tại:\n${path}`);
    setExporting(false);
  }

  function handleDelete() {
    Alert.alert(
      'Xoá tài khoản',
      'Tất cả dữ liệu sức khoẻ sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn tác.',
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Xoá tất cả', style: 'destructive', onPress: async () => {
          await deleteAllData();
          onAccountDeleted();
        }},
      ]
    );
  }

  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: colors.text.primary, fontFamily: fonts.bold }]}>
        Quyền riêng tư & Dữ liệu
      </Text>

      {/* Sharing toggle */}
      <View style={[s.row, { borderBottomColor: colors.border }]}>
        <Share2 size={18} color={colors.text.muted} strokeWidth={2} />
        <View style={{ flex: 1 }}>
          <Text style={[s.label, { color: colors.text.primary, fontFamily: fonts.semibold }]}>Chia sẻ với bạn bè</Text>
          <Text style={[s.desc, { color: colors.text.muted, fontFamily: fonts.regular }]}>Hiển thị hoạt động trên bảng xếp hạng</Text>
        </View>
        <Switch value={shareWithFriends} onValueChange={onSetShare}
          trackColor={{ false: colors.border, true: colors.primary + '80' }}
          thumbColor={shareWithFriends ? colors.primary : colors.surfaceElevated}
        />
      </View>

      {/* Analytics toggle */}
      <View style={[s.row, { borderBottomColor: colors.border }]}>
        <Shield size={18} color={colors.text.muted} strokeWidth={2} />
        <View style={{ flex: 1 }}>
          <Text style={[s.label, { color: colors.text.primary, fontFamily: fonts.semibold }]}>Phân tích ẩn danh</Text>
          <Text style={[s.desc, { color: colors.text.muted, fontFamily: fonts.regular }]}>Giúp cải thiện app (không lưu health data)</Text>
        </View>
        <Switch value={analyticsEnabled} onValueChange={onSetAnalytics}
          trackColor={{ false: colors.border, true: colors.primary + '80' }}
          thumbColor={analyticsEnabled ? colors.primary : colors.surfaceElevated}
        />
      </View>

      {/* Export */}
      <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.surfaceElevated }]} onPress={handleExport} disabled={exporting}>
        <Download size={18} color={colors.primary} strokeWidth={2} />
        <Text style={[s.actionText, { color: colors.primary, fontFamily: fonts.bold }]}>
          {exporting ? 'Đang xuất...' : 'Xuất dữ liệu (JSON)'}
        </Text>
      </TouchableOpacity>

      {/* Delete */}
      <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#EF444418', borderColor: '#EF444440', borderWidth: 1 }]} onPress={handleDelete}>
        <Trash2 size={18} color="#EF4444" strokeWidth={2} />
        <Text style={[s.actionText, { color: '#EF4444', fontFamily: fonts.bold }]}>
          Xoá tất cả dữ liệu
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  section: { gap: 12 },
  sectionTitle: { fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 14 },
  desc: { fontSize: 11, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 13, borderRadius: 14 },
  actionText: { fontSize: 14 },
});
