/**
 * PART:   GeneralSettings — units, language, theme
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  33s — Settings Architecture
 * TASK:   Toggle units metric/imperial, language vi/en, theme light/dark/system
 * SCOPE:  IN: useSettings hook
 *         OUT: none
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Moon, Sun, Globe, Ruler } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { UnitSystem, Language, ThemeMode } from '@/services/settings/SettingsService';

interface Props {
  units: UnitSystem;
  language: Language;
  theme: ThemeMode;
  onSetUnits: (v: UnitSystem) => void;
  onSetLanguage: (v: Language) => void;
  onSetTheme: (v: ThemeMode) => void;
}

function OptionRow({ label, icon, options, value, onChange }: {
  label: string; icon: React.ReactNode;
  options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void;
}) {
  const { colors, fonts } = useTheme();
  return (
    <View style={[s.row, { borderBottomColor: colors.border }]}>
      <View style={s.rowLeft}>
        {icon}
        <Text style={[s.rowLabel, { color: colors.text.primary, fontFamily: fonts.semibold }]}>{label}</Text>
      </View>
      <View style={s.chips}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.chip, { backgroundColor: value === opt.value ? colors.primary : colors.surfaceElevated }]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[s.chipText, { color: value === opt.value ? '#FFF' : colors.text.secondary, fontFamily: fonts.semibold }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export function GeneralSettings({ units, language, theme, onSetUnits, onSetLanguage, onSetTheme }: Props) {
  const { colors, fonts } = useTheme();
  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: colors.text.primary, fontFamily: fonts.bold }]}>Chung</Text>
      <OptionRow
        label="Đơn vị" icon={<Ruler size={18} color={colors.text.muted} strokeWidth={2} />}
        options={[{ value: 'metric', label: 'Metric' }, { value: 'imperial', label: 'Imperial' }]}
        value={units} onChange={(v) => onSetUnits(v as UnitSystem)}
      />
      <OptionRow
        label="Ngôn ngữ" icon={<Globe size={18} color={colors.text.muted} strokeWidth={2} />}
        options={[{ value: 'vi', label: '🇻🇳 Tiếng Việt' }, { value: 'en', label: '🇬🇧 English' }]}
        value={language} onChange={(v) => onSetLanguage(v as Language)}
      />
      <OptionRow
        label="Giao diện" icon={<Sun size={18} color={colors.text.muted} strokeWidth={2} />}
        options={[{ value: 'light', label: '☀️ Sáng' }, { value: 'dark', label: '🌙 Tối' }, { value: 'system', label: '📱 Hệ thống' }]}
        value={theme} onChange={(v) => onSetTheme(v as ThemeMode)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  section: { gap: 4 },
  sectionTitle: { fontSize: 16, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 14 },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  chipText: { fontSize: 12 },
});
