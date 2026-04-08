/**
 * PART:   Demo Flow — hidden screen for stage presentation
 * ACTOR:  Gemini 3.1
 * PHASE:  12 — Demo Flow
 * READS:  AGENTS.md §7, PLAN_B §Demo Flow, GEMINI_PHASES.md §PHASE 12
 * TASK:   Step-by-step guide: Home → Voice → Exercise → Twin → Fintech
 * SCOPE:  IN: navigation between demo steps, timer overlay, presenter notes
 *         OUT: production UI (this is internal tool)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '@/constants/theme';

interface DemoStep {
    title: string;
    route: string;
    duration: number; // seconds
    notes: string;
}

const STEPS: DemoStep[] = [
    {
        title: 'BƯỚC 1/5: HOME SCREEN',
        route: '/(tabs)',
        duration: 30,
        notes: 'Mở app: "Xin chào BGK, đây là ARA MetaboliQ. Hãy nhìn vào Health Score 78 - một điểm số khá tốt nhưng còn tiềm năng tiết kiệm bảo hiểm."',
    },
    {
        title: 'BƯỚC 2/5: VOICE CHECK',
        route: '/(tabs)/voice',
        duration: 45,
        notes: 'Click Voice: "Chỉ với 5s nói, chúng tôi phân tích Vocal Biomarkers để phát hiện sớm dấu hiệu đường huyết và stress."',
    },
    {
        title: 'BƯỚC 3/5: EXERCISE (PPG)',
        route: '/(tabs)/exercise',
        duration: 45,
        notes: 'Click Pod icon: "Khi bạn đeo ARA Pod, sóng PPG thời gian thực được stream trực tiếp để theo dõi nhịp tim và SpO2 chuẩn lâm sàng."',
    },
    {
        title: 'BƯỚC 4/5: DIGITAL TWIN',
        route: '/(tabs)/twin',
        duration: 30,
        notes: 'Mở Twin: "Đây là Digital Twin của bạn. Mọi chỉ số sinh học được cụ thể hóa thành hình ảnh trực quan, giúp bạn hiểu cơ thể mình hơn."',
    },
    {
        title: 'BƯỚC 5/5: FINTECH / HSA',
        route: '/(tabs)/fintech',
        duration: 30,
        notes: 'Sang Fintech: "Kết quả cuối cùng là tiền! Score cao giúp giảm tới 30% phí bảo hiểm, tự động hóa tiết kiệm vào quỹ HSA."',
    },
];

export default function DemoFlowScreen() {
    const router = useRouter();
    const [currentIdx, setCurrentIdx] = useState(0);
    const [timeLeft, setTimeLeft] = useState(STEPS[0].duration);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const step = STEPS[currentIdx];

    // ── Timer Logic ──
    useEffect(() => {
        setTimeLeft(step.duration);
        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentIdx, step.duration]);

    function nextStep() {
        if (currentIdx < STEPS.length - 1) {
            const nextIdx = currentIdx + 1;
            setCurrentIdx(nextIdx);
            router.push(STEPS[nextIdx].route as any);
        } else {
            router.replace('/(tabs)');
        }
    }

    function prevStep() {
        if (currentIdx > 0) {
            setCurrentIdx(currentIdx - 1);
            router.push(STEPS[currentIdx - 1].route as any);
        }
    }

    const isLowTime = timeLeft <= 10;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* ── Top Control Bar ── */}
            <View style={styles.topBar}>
                <View style={styles.stepInfo}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <View style={styles.progressBar}>
                        {STEPS.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.progressDot,
                                    i <= currentIdx && { backgroundColor: colors.primary },
                                ]}
                            />
                        ))}
                    </View>
                </View>

                <View style={[styles.timerContainer, isLowTime && styles.timerLow]}>
                    <Text style={[styles.timerText, isLowTime && styles.timerTextLow]}>
                        {timeLeft}s
                    </Text>
                </View>
            </View>

            {/* ── Main View Area (Empty, actual screen is behind or we navigate away) ── */}
            <View style={styles.main}>
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color={colors.primary} />
                    <Text style={styles.infoText}>
                        Bạn đang ở chế độ Trình diễn. Màn hình thực tế đang hiển thị:
                        <Text style={{ fontWeight: '800' }}> {step.route}</Text>
                    </Text>
                </View>

                <Text style={styles.notesLabel}>PRESENTER NOTES (Script):</Text>
                <ScrollView style={styles.notesScroll} contentContainerStyle={styles.notesContent}>
                    <Text style={styles.notesText}>{step.notes}</Text>
                </ScrollView>
            </View>

            {/* ── Bottom Controls ── */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.btn, styles.btnBack, currentIdx === 0 && { opacity: 0.3 }]}
                    onPress={prevStep}
                    disabled={currentIdx === 0}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
                    <Text style={styles.btnTextBack}>QUAY LẠI</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnNext} onPress={nextStep}>
                    <Text style={styles.btnTextNext}>
                        {currentIdx === STEPS.length - 1 ? 'XONG' : 'BƯỚC TIẾP THEO'}
                    </Text>
                    <Ionicons
                        name={currentIdx === STEPS.length - 1 ? 'checkmark-circle' : 'chevron-forward'}
                        size={24}
                        color="#FFF"
                    />
                </TouchableOpacity>
            </View>

            {/* ── Overlay shortcut (Floating to return to this screen if navigates manually) ── */}
            <TouchableOpacity
                style={styles.floatingBtn}
                onPress={() => router.push('/demo-flow')}
            >
                <Ionicons name="apps" size={24} color="#FFF" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Top Bar
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    stepInfo: { flex: 1 },
    stepTitle: { fontSize: 13, fontWeight: '800', color: colors.text.secondary, letterSpacing: 1 },
    progressBar: { flexDirection: 'row', gap: 4, marginTop: 6 },
    progressDot: { height: 4, width: 24, borderRadius: 2, backgroundColor: colors.border },

    timerContainer: {
        width: 50, height: 50, borderRadius: 25,
        borderWidth: 3, borderColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    timerLow: { borderColor: colors.health.warning },
    timerText: { fontSize: 18, fontWeight: '800', color: colors.primary },
    timerTextLow: { color: colors.health.warning },

    // Main
    main: { flex: 1, padding: spacing.xl, gap: spacing.lg },
    infoBox: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: colors.primary + '10', padding: spacing.md, borderRadius: radius.md,
    },
    infoText: { flex: 1, fontSize: 13, color: colors.text.secondary, lineHeight: 18 },

    notesLabel: { fontSize: 11, fontWeight: '800', color: colors.text.muted, letterSpacing: 0.5 },
    notesScroll: { flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: radius.lg, padding: spacing.lg },
    notesContent: { paddingBottom: spacing.lg },
    notesText: { fontSize: 18, fontWeight: '600', color: colors.text.primary, lineHeight: 28 },

    // Bottom Bar
    bottomBar: {
        flexDirection: 'row', padding: spacing.lg, gap: spacing.md,
        backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
    },
    btn: {
        height: 56, borderRadius: radius.md,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    btnBack: { flex: 1, backgroundColor: colors.surfaceElevated },
    btnNext: {
        flex: 2, backgroundColor: colors.primary,
        shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    },
    btnTextBack: { fontSize: 15, fontWeight: '700', color: colors.text.secondary },
    btnTextNext: { fontSize: 15, fontWeight: '700', color: '#FFF' },

    floatingBtn: {
        position: 'absolute', right: 20, bottom: 90,
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10,
    },
});
