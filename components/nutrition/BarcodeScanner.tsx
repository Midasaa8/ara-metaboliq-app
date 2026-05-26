/**
 * PART:   BarcodeScanner — expo-camera barcode scan screen
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  24s — Food & Water Service
 * TASK:   Full-screen camera with guide frame, scan barcode → call onScan callback
 * SCOPE:  IN: camera permission, barcode events
 *         OUT: food lookup (parent calls scanBarcode()), quantity entry
 */

import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { X, Zap } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: Props) {
  const { colors, fonts } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const cooldown = useRef(false);

  function handleBarcodeScanned({ data }: BarcodeScanningResult) {
    if (cooldown.current) return;
    cooldown.current = true;
    setScanned(true);
    onScan(data);
    setTimeout(() => { cooldown.current = false; setScanned(false); }, 2000);
  }

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <Text style={[s.permText, { color: colors.text.primary, fontFamily: fonts.regular }]}>
          Cần quyền truy cập camera để quét mã vạch
        </Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={requestPermission}>
          <Text style={[s.btnText, { fontFamily: fonts.bold }]}>Cấp quyền</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <X size={24} color={colors.text.muted} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      {/* Guide overlay */}
      <View style={s.overlay}>
        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <X size={24} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={s.frame}>
          <View style={[s.corner, s.tl]} />
          <View style={[s.corner, s.tr]} />
          <View style={[s.corner, s.bl]} />
          <View style={[s.corner, s.br]} />
        </View>
        <View style={s.hint}>
          <Zap size={16} color={scanned ? '#4ECFB5' : '#FFF'} strokeWidth={2} />
          <Text style={[s.hintText, { fontFamily: fonts.semibold }]}>
            {scanned ? 'Đã quét!' : 'Đặt mã vạch vào khung'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const FRAME = 260;
const s = StyleSheet.create({
  root: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  closeBtn: { alignSelf: 'flex-end', padding: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)' },
  frame: { width: FRAME, height: FRAME, position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#FFF', borderWidth: 3 },
  tl: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  tr: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  bl: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  br: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
  hintText: { color: '#FFF', fontSize: 14 },
  permText: { fontSize: 16, textAlign: 'center', marginHorizontal: 32, marginBottom: 24 },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  btnText: { color: '#FFF', fontSize: 15 },
});
