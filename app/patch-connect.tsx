/**
 * PART:   Patch Connect Screen — UI shell
 * ACTOR:  Gemini 3.1
 * PHASE:  10 — Hackathon Polish
 * READS:  AGENTS.md §7, PLAN_B §XI Patch Connect, GEMINI_PHASES.md §PHASE 10,
 *         services/hardware/MockHardware.ts
 * TASK:   BLE scan animation, patch found card, connection status states
 * SCOPE:  IN: scan animation, device card, status screens
 *         OUT: real BLE scan (Phase 11 Claude Sonnet)
 *              patch recognition algorithm (Phase 16 Claude Sonnet)
 * HARDWARE STATUS: MOCK — no real device exists yet
 */

import { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getHardwareService } from '@/services/hardware/MockHardware';
import { colors, fonts, spacing, radius } from '@/constants/theme';

type ConnectState = 'idle' | 'scanning' | 'found' | 'connecting' | 'connected' | 'error';

// ── Concentric ripple rings animation component ──
function ScanRings({ active }: { active: boolean }) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      ring1.setValue(0);
      ring2.setValue(0);
      ring3.setValue(0);
      return;
    }

    const animate = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = animate(ring1, 0);
    const a2 = animate(ring2, 600);
    const a3 = animate(ring3, 1200);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [active, ring1, ring2, ring3]);

  const makeRingStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.2, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
  });

  return (
    <View style={styles.ringsContainer}>
      <Animated.View style={[styles.ring, makeRingStyle(ring3)]} />
      <Animated.View style={[styles.ring, makeRingStyle(ring2)]} />
      <Animated.View style={[styles.ring, makeRingStyle(ring1)]} />
    </View>
  );
}

// ── Central pod icon ──
function PodIcon({ state }: { state: ConnectState }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'connecting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state, pulseAnim]);

  const iconName =
    state === 'connected' ? 'checkmark-circle' :
      state === 'error' ? 'close-circle' :
        'hardware-chip';

  const iconColor =
    state === 'connected' ? colors.health.good :
      state === 'error' ? colors.health.danger :
        state === 'found' ? colors.secondary :
          colors.primary;

  const bgColor = iconColor + '20';

  return (
    <Animated.View style={[styles.podIconOuter, { backgroundColor: bgColor, transform: [{ scale: pulseAnim }] }]}>
      <View style={[styles.podIconInner, { backgroundColor: bgColor }]}>
        <Ionicons name={iconName} size={56} color={iconColor} />
      </View>
    </Animated.View>
  );
}

// ── Device found card ──
function DeviceCard({ onConnect }: { onConnect: () => void }) {
  return (
    <View style={styles.deviceCard}>
      <View style={styles.deviceCardLeft}>
        <View style={styles.deviceIconBadge}>
          <Ionicons name="hardware-chip" size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.deviceName}>ARA-MOCK-0001</Text>
          <Text style={styles.deviceMeta}>Bluetooth · Signal −62 dBm</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.deviceConnectBtn} onPress={onConnect} activeOpacity={0.85}>
        <Text style={styles.deviceConnectText}>Kết nối</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Status message ──
const STATUS_CONFIG: Record<ConnectState, { title: string; sub: string }> = {
  idle: { title: 'Tìm kiếm ARA Pod', sub: 'Nhấn nút bên dưới để bắt đầu' },
  scanning: { title: 'Đang quét Bluetooth…', sub: 'Đảm bảo Pod đang bật & gần điện thoại' },
  found: { title: 'Đã tìm thấy thiết bị!', sub: 'ARA-MOCK-0001 đang chờ kết nối' },
  connecting: { title: 'Đang kết nối…', sub: 'Đang thiết lập kết nối an toàn' },
  connected: { title: 'Kết nối thành công! ✓', sub: 'DEMO MODE · Mock data active · 25 Hz' },
  error: { title: 'Không tìm thấy Pod', sub: 'Kiểm tra Bluetooth và thử lại' },
};

// ── Main screen ──
export default function PatchConnectScreen() {
  const router = useRouter();
  const [state, setState] = useState<ConnectState>('idle');

  async function handleScan() {
    setState('scanning');
    // Simulate BLE scan delay → found → connect
    await new Promise((r) => setTimeout(r, 2000));
    setState('found');
  }

  async function handleConnect() {
    setState('connecting');
    try {
      // TODO: HARDWARE_INTEGRATION Phase 11 — replace with BLEService.connect()
      const hw = getHardwareService();
      const ok = await hw.connect();
      setState(ok ? 'connected' : 'error');
    } catch {
      setState('error');
    }
  }

  function reset() { setState('idle'); }

  const isScanning = state === 'scanning';
  const isFound = state === 'found';
  const isConnecting = state === 'connecting';
  const isConnected = state === 'connected';
  const isError = state === 'error';
  const isActive = isScanning || isConnecting;
  const { title, sub } = STATUS_CONFIG[state];

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Quay lại">
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kết nối ARA Pod</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        {/* ── Scan animation stage ── */}
        <View style={styles.scanStage}>
          <ScanRings active={isActive} />
          <PodIcon state={state} />
        </View>

        {/* ── Status text ── */}
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>{title}</Text>
          <Text style={styles.statusSub}>{sub}</Text>
        </View>

        {/* ── Device found card ── */}
        {isFound && <DeviceCard onConnect={handleConnect} />}

        {/* ── Connected vitals preview ── */}
        {isConnected && (
          <View style={styles.connectedPreview}>
            <View style={styles.vitalPill}>
              <Ionicons name="heart" size={14} color={colors.health.danger} />
              <Text style={styles.vitalText}>72 BPM</Text>
            </View>
            <View style={styles.vitalPill}>
              <Ionicons name="water" size={14} color={colors.secondary} />
              <Text style={styles.vitalText}>98% SpO₂</Text>
            </View>
            <View style={styles.vitalPill}>
              <Ionicons name="thermometer" size={14} color={colors.health.warning} />
              <Text style={styles.vitalText}>36.5°C</Text>
            </View>
          </View>
        )}

        {/* ── Bottom CTA ── */}
        {(state === 'idle' || state === 'error') && (
          <TouchableOpacity style={styles.ctaBtn} onPress={handleScan} activeOpacity={0.85}>
            <Ionicons name="search" size={18} color="#FFF" />
            <Text style={styles.ctaBtnText}>{state === 'error' ? 'Quét lại' : 'Bắt đầu quét'}</Text>
          </TouchableOpacity>
        )}

        {isScanning && (
          <View style={styles.scanningIndicator}>
            <View style={styles.scanningDot} />
            <Text style={styles.scanningText}>Đang tìm kiếm thiết bị BLE…</Text>
          </View>
        )}

        {isConnected && (
          <View style={{ gap: spacing.sm, width: '100%' }}>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={18} color="#FFF" />
              <Text style={styles.ctaBtnText}>Xong — Về trang chủ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetBtn} onPress={reset}>
              <Text style={styles.resetBtnText}>Ngắt kết nối</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Hardware disclaimer ── */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={colors.text.muted} />
          <Text style={styles.disclaimerText}>
            TODO HARDWARE_INTEGRATION Phase 11: BLEService.connect() thực tế
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fonts.sizes.lg, fontWeight: '700', color: colors.text.primary },

  body: {
    flex: 1, alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },

  // ── Scan stage ──
  scanStage: {
    width: 240, height: 240,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  ringsContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: colors.primary,
  },

  // ── Pod icon ──
  podIconOuter: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  podIconInner: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Status text ──
  statusSection: { alignItems: 'center', gap: 8 },
  statusTitle: { fontSize: fonts.sizes.xl, fontWeight: '800', color: colors.text.primary, textAlign: 'center' },
  statusSub: { fontSize: fonts.sizes.sm, color: colors.text.secondary, textAlign: 'center', lineHeight: 20 },

  // ── Device card ──
  deviceCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    shadowColor: '#273538', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  deviceCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  deviceIconBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  deviceName: { fontSize: fonts.sizes.md, fontWeight: '700', color: colors.text.primary },
  deviceMeta: { fontSize: 11, color: colors.text.secondary, marginTop: 2 },
  deviceConnectBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  deviceConnectText: { color: '#FFF', fontSize: fonts.sizes.sm, fontWeight: '700' },

  // ── Connected vitals preview ──
  connectedPreview: { flexDirection: 'row', gap: spacing.sm },
  vitalPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: 6, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  vitalText: { fontSize: fonts.sizes.xs, fontWeight: '700', color: colors.text.primary },

  // ── CTA buttons ──
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  ctaBtnText: { color: '#FFF', fontSize: fonts.sizes.md, fontWeight: '700' },
  resetBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  resetBtnText: { color: colors.text.secondary, fontSize: fonts.sizes.sm, fontWeight: '600' },

  // ── Scanning indicator ──
  scanningIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: radius.full,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
  },
  scanningDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  scanningText: { color: colors.primary, fontSize: fonts.sizes.xs, fontWeight: '700' },

  // ── Disclaimer ──
  disclaimer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md, padding: spacing.md,
    width: '100%', marginTop: 'auto',
  },
  disclaimerText: { color: colors.text.muted, fontSize: 10, flex: 1, lineHeight: 14 },
});
