/**
 * PART:   FoodSearchBar — debounced food search input
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  24s — Food & Water Service
 * TASK:   Text input with 400ms debounce, dropdown of results, select to add
 * SCOPE:  IN: receives onSelect callback; calls useFood().search
 *         OUT: quantity picker (sheet), meal categorization (sheet)
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { OFFFoodItem } from '@/services/nutrition/openFoodFactsAPI';

interface Props {
  onSelect: (item: OFFFoodItem) => void;
  onSearch: (q: string) => Promise<void>;
  results: OFFFoodItem[];
  isSearching: boolean;
}

export function FoodSearchBar({ onSelect, onSearch, results, isSearching }: Props) {
  const { colors, fonts } = useTheme();
  const [query, setQuery] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(query), 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, onSearch]);

  function clear() { setQuery(''); onSearch(''); }

  return (
    <View>
      <View style={[s.bar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <Search size={18} color={colors.text.muted} strokeWidth={2} />
        <TextInput
          style={[s.input, { color: colors.text.primary, fontFamily: fonts.regular }]}
          placeholder="Tìm thực phẩm..."
          placeholderTextColor={colors.text.muted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {isSearching
          ? <ActivityIndicator size="small" color={colors.secondary} />
          : query.length > 0 && (
            <TouchableOpacity onPress={clear}>
              <X size={18} color={colors.text.muted} strokeWidth={2} />
            </TouchableOpacity>
          )
        }
      </View>

      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(_, i) => String(i)}
          style={[s.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.row, { borderBottomColor: colors.border }]}
              onPress={() => { onSelect(item); clear(); }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: colors.text.primary, fontFamily: fonts.semibold }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[s.meta, { color: colors.text.muted, fontFamily: fonts.regular }]}>
                  {item.brand ? `${item.brand} · ` : ''}{Math.round(item.calories_per_100g)} kcal/100g
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  input: { flex: 1, fontSize: 15 },
  dropdown: { borderRadius: 12, borderWidth: 1, marginTop: 4, maxHeight: 240 },
  row: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 14 },
  meta: { fontSize: 12, marginTop: 2 },
});
