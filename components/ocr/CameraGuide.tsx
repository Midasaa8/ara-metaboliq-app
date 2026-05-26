/**
 * PART:   CameraGuide — camera overlay with guide frame for lab scan
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  28s — Medical OCR Service
 * TASK:   expo-camera screen with corner-frame overlay, auto/manual capture
 * SCOPE:  IN: expo-camera, onCapture callback
 *         OUT: image analysis (MedicalOCRService)
 */

import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, X, Zap } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  onCapture: (uri: string) => void;
  onClose: () => void;
}

const { width: SW, height: SH } = Dimensions.get('window');
const FRAME_W = SW - 48;
const FRAME_H = FRAME_W * 0.65;

export function CameraGuide({ onCapture, onClose }: Props) {
  const { colors, fonts } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  async function capture() {
    if (capturing || !cameraRef.current) return;
    setCapturing(true);
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, base64: false });
    if (photo?.uri) onCapture(photo.uri);
    setCapturing(false);
  }

  if (!permission?.granted) {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <Text style={[s.permText, { color: colors.text.primary, fontFamily: fonts.regular }]}>
          Cần quyền camera để quét phiếu xét nghiệm
        </Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={requestPermission}>
          <Text style={[s.btnText, { fontFamily: fonts.bold }]}>Cấp quyền</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <X size={24} color={colors.text.muted} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <View style={s.overlay}>
        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <X size={24} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={[s.frame, { width: FRAME_W, height: FRAME_H }]}>
          {/* 4 corner markers */}
          {([['tl', s.tl], ['tr', s.tr], ['bl', s.bl], ['br', s.br]] as const).map(([key, style]) => (
            <View key={key} style={[s.corner, style]} />
          ))}
          <Text style={[s.frameHint, { fontFamily: fonts.semibold }]}>
            Căn chỉnh phiếu xét nghiệm trong khung
          </Text>
        </View>

        <TouchableOpacity
          style={[s.captureBtn, capturing && { opacity: 0.6 }]}
          onPress={capture}
          disabled={capturing}
        >
          <Camera size={28} color="#FFF" strokeWidth={2} />
          <Text style={[s.captureBtnText, { fontFamily: fonts.bold }]}>
            {capturing ? 'Đang chụp...' : 'Chụp ảnh'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 48 },
  closeBtn: { alignSelf: 'flex-end', marginRight: 20, padding: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  frame: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#FFF', borderWidth: 3 },
  tl: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  tr: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  bl: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  br: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  frameHint: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  captureBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(193,39,74,0.9)', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 30 },
  captureBtnText: { color: '#FFF', fontSize: 15 },
  permText: { fontSize: 15, textAlign: 'center', marginHorizontal: 32, marginBottom: 24 },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  btnText: { color: '#FFF', fontSize: 15 },
});
