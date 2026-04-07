/**
 * PART:   Patch Connect Screen — BLE device pairing flow
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  2 — Navigation Shell
 * READS:  AGENTS.md §8 Hardware Stubs, services/hardware/MockHardware.ts
 * TASK:   Mock patch connection UI — real BLE scan added in Phase 11
 * SCOPE:  IN: connection status display, mock connect button
 *         OUT: real BLE scan/pair (BLEService.ts Phase 11)
 * HARDWARE STATUS: MOCK
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getHardwareService } from '@/services/hardware/MockHardware';
import { colors, fonts, spacing, radius } from '@/constants/theme';

type ConnectState = 'idle' | 'scanning' | 'connected' | 'error';

export default function PatchConnectScreen() {
  const router = useRouter();
  const [state, setState] = useState<ConnectState>('idle');

  async function handleConnect() {
    setState('scanning');
    try {
      // TODO: HARDWARE_INTEGRATION — Phase 11: this calls BLEService.connect() in production
      const hw = getHardwareService();
      const ok = await hw.connect();
      setState(ok ? 'connected' : 'error');
    } catch {
      setState('error');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Quay lại">
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Kết nối ARA Pod</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        {/* Pod illustration */}
        <View style={styles.podIcon}>
          <Ionicons
            name={state === 'connected' ? 'checkmark-circle' : 'radio-button-on'}
            size={80}
            color={state === 'connected' ? colors.health.good : state === 'error' ? colors.health.danger : colors.primary}
          />
        </View>

        <Text style={styles.statusText}>
          {state === 'idle'      && 'Nhấn để tìm kiếm ARA Pod'}
          {state === 'scanning'  && 'Đang tìm kiếm...'}
          {state === 'connected' && 'Đã kết nối ARA-MOCK-0001'}
          {state === 'error'     && 'Không tìm thấy Pod'}
        </Text>
        <Text style={styles.statusSub}>
          {/* TODO: HARDWARE_INTEGRATION — Phase 11: remove MOCK label */}
          {state === 'connected' ? 'DEMO MODE · Mock data active' : 'Đảm bảo Pod đang bật và gần điện thoại'}
        </Text>

        {state === 'scanning' ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <TouchableOpacity
            style={[styles.btn, state === 'connected' && styles.btnConnected]}
            onPress={state === 'connected' ? () => router.back() : handleConnect}
            accessibilityLabel={state === 'connected' ? 'Xong' : 'Kết nối'}
          >
            <Text style={styles.btnText}>
              {state === 'connected' ? 'Xong ✓' : state === 'error' ? 'Thử lại' : 'Kết nối'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  header:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  title:       { color: colors.text.primary, fontSize: fonts.sizes.lg, fontWeight: '600' },
  body:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  podIcon:     { marginBottom: spacing.md },
  statusText:  { color: colors.text.primary, fontSize: fonts.sizes.xl, fontWeight: '700', textAlign: 'center' },
  statusSub:   { color: colors.text.secondary, fontSize: fonts.sizes.sm, textAlign: 'center' },
  btn: {
    backgroundColor:  colors.primary,
    borderRadius:     radius.md,
    paddingVertical:  spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop:        spacing.lg,
  },
  btnConnected: { backgroundColor: colors.health.good },
  btnText:      { color: colors.text.primary, fontSize: fonts.sizes.lg, fontWeight: '700' },
});

