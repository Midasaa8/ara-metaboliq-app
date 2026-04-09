/**
 * PART:   Nutrition Scanner — Wellness Redesign
 * ACTOR:  Gemini 3.1
 * PHASE:  UI Redesign — Floating Cards
 * TASK:   Premium receipt/bill scanning with Ivory bg and Peach accent
 * SCOPE:  IN: UI, scan button, nutrient tables, bento layout
 *         OUT: GPT-4o OCR logic (backend)
 */

import { useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    History,
    Camera,
    ShoppingBasket,
    AlertCircle,
    AlertTriangle,
    PieChart
} from 'lucide-react-native';
import { colors, fonts, spacing, radius, elevation } from '@/constants/theme';

export default function NutritionScreen() {
    const pulseAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.95, duration: 2000, useNativeDriver: true }),
            ])
        ).start();
    }, [pulseAnim]);

    return (
        <SafeAreaView style={s.root} edges={['top']}>
            {/* ── HEADER ── */}
            <View style={s.header}>
                <View>
                    <Text style={s.title}>Nutrition Intelligence</Text>
                    <Text style={s.subtitle}>Receipt & Food Scanner</Text>
                </View>
                <TouchableOpacity style={s.iconBtn}>
                    <History size={20} color={colors.primary} strokeWidth={2} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── SCAN HERO (Peach Accent) ── */}
                <View style={s.heroSection}>
                    <Animated.View style={[s.scanBtnContainer, { transform: [{ scale: pulseAnim }] }]}>
                        <TouchableOpacity style={[s.scanBtn, elevation.hero]}>
                            <Camera size={40} color="#fff" strokeWidth={1.5} />
                            <Text style={s.scanBtnText}>Scan Bill</Text>
                        </TouchableOpacity>
                    </Animated.View>
                    <Text style={s.heroDesc}>
                        Analyze receipts to unlock nutritional insights and price comparisons.
                    </Text>
                </View>

                {/* ── LATEST SCAN PREVIEW ── */}
                <Text style={s.sectionTitle}>Latest Analysis</Text>
                <View style={[s.card, elevation.float]}>
                    <View style={s.cardHead}>
                        <ShoppingBasket size={18} color={colors.secondary} strokeWidth={2} />
                        <Text style={s.cardTitle}>Whole Foods Market</Text>
                        <Text style={s.timeText}>Today, 12:45</Text>
                    </View>
                    <View style={s.tableHeader}>
                        <Text style={[s.colName, s.tableLabel]}>ITEM</Text>
                        <Text style={[s.colVal, s.tableLabel]}>KCAL</Text>
                        <Text style={[s.colVal, s.tableLabel]}>PROT</Text>
                        <Text style={[s.colVal, s.tableLabel]}>PRICE</Text>
                    </View>
                    {[
                        { n: 'Greek Yogurt', k: 120, p: '18g', pr: '$5.99' },
                        { n: 'Almond Milk', k: 30, p: '1g', pr: '$3.49' },
                        { n: 'Ribeye Steak', k: 650, p: '54g', pr: '$18.20' },
                    ].map((item, idx) => (
                        <View key={idx} style={s.tableRow}>
                            <Text style={s.colName} numberOfLines={1}>{item.n}</Text>
                            <Text style={s.colVal}>{item.k}</Text>
                            <Text style={[s.colVal, { color: colors.secondary, fontWeight: '700' }]}>{item.p}</Text>
                            <Text style={s.colVal}>{item.pr}</Text>
                        </View>
                    ))}
                </View>

                {/* ── ALERTS (Soft Coral) ── */}
                <View style={s.grid}>
                    <View style={[s.alertCard, elevation.low, { borderColor: colors.health.danger + '30' }]}>
                        <View style={[s.alertIcon, { backgroundColor: colors.health.danger + '15' }]}>
                            <AlertCircle size={20} color={colors.health.danger} strokeWidth={2.5} />
                        </View>
                        <Text style={s.alertTitle}>Processed Ingredient</Text>
                        <Text style={s.alertDesc}>Stabilizers found in Yogurt.</Text>
                    </View>

                    <View style={[s.alertCard, elevation.low, { borderColor: colors.health.warning + '30' }]}>
                        <View style={[s.alertIcon, { backgroundColor: colors.health.warning + '15' }]}>
                            <AlertTriangle size={20} color={colors.health.warning} strokeWidth={2.5} />
                        </View>
                        <Text style={s.alertTitle}>High Sodium</Text>
                        <Text style={s.alertDesc}>Ribeye exceeds daily limit.</Text>
                    </View>
                </View>

                {/* ── BUDGET INSIGHT (Sage Green) ── */}
                <View style={[s.card, elevation.float]}>
                    <View style={s.cardHead}>
                        <PieChart size={18} color={colors.health.good} strokeWidth={2} />
                        <Text style={s.cardTitle}>Budget Intelligence</Text>
                        <View style={s.savingsBadge}>
                            <Text style={s.savingsText}>-12% vs Avg</Text>
                        </View>
                    </View>
                    <View style={s.progressRow}>
                        <View style={s.progressCol}>
                            <View style={[s.bar, { height: '60%', backgroundColor: colors.primary }]} />
                            <Text style={s.barLabel}>You</Text>
                        </View>
                        <View style={s.progressCol}>
                            <View style={[s.bar, { height: '100%', backgroundColor: colors.border }]} />
                            <Text style={s.barLabel}>Market</Text>
                        </View>
                        <View style={s.progressCol}>
                            <View style={[s.bar, { height: '80%', backgroundColor: colors.border }]} />
                            <Text style={s.barLabel}>Premium</Text>
                        </View>
                    </View>
                    <View style={s.budgetTip}>
                        <Text style={s.tipText}>You saved <Text style={{ fontWeight: '800', color: colors.health.good }}>$14.20</Text> by choosing bulk grains.</Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    },
    title: { fontSize: fonts.sizes.xl, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.5 },
    subtitle: { fontSize: fonts.sizes.sm, color: colors.text.secondary },
    iconBtn: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface,
        alignItems: 'center', justifyContent: 'center', ...elevation.low,
    },

    scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

    // Hero
    heroSection: { alignItems: 'center', marginVertical: spacing.xl },
    scanBtnContainer: { width: 140, height: 140, marginBottom: spacing.lg },
    scanBtn: {
        flex: 1, borderRadius: 70, backgroundColor: colors.accent,
        alignItems: 'center', justifyContent: 'center', gap: 4,
    },
    scanBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    heroDesc: { textAlign: 'center', color: colors.text.secondary, fontSize: 13, paddingHorizontal: 40, lineHeight: 20 },

    sectionTitle: { fontSize: fonts.sizes.sm, fontWeight: '700', color: colors.text.secondary, marginBottom: spacing.md },

    // Card
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.lg },
    cardTitle: { flex: 1, fontSize: fonts.sizes.md, fontWeight: '700', color: colors.text.primary },
    timeText: { fontSize: 12, color: colors.text.muted, fontWeight: '600' },

    // Table
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, marginBottom: 8 },
    tableLabel: { fontSize: 10, fontWeight: '800', color: colors.text.muted, letterSpacing: 0.5 },
    tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.background },
    colName: { flex: 2, fontSize: 13, fontWeight: '600', color: colors.text.primary },
    colVal: { flex: 1, textAlign: 'center', fontSize: 13, color: colors.text.secondary, fontWeight: '500' },

    // Grid / Alerts
    grid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
    alertCard: {
        flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
        borderWidth: 1.5, gap: 4,
    },
    alertIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    alertTitle: { fontSize: 12, fontWeight: '800', color: colors.text.primary },
    alertDesc: { fontSize: 11, color: colors.text.secondary, lineHeight: 16 },

    // Budget progress
    progressRow: { flexDirection: 'row', height: 100, gap: spacing.lg, paddingHorizontal: spacing.xl, alignItems: 'flex-end', marginBottom: spacing.lg },
    progressCol: { flex: 1, alignItems: 'center' },
    bar: { width: '100%', borderRadius: 4, opacity: 0.8 },
    barLabel: { fontSize: 10, fontWeight: '700', color: colors.text.muted, marginTop: 8, textTransform: 'uppercase' },
    savingsBadge: { backgroundColor: colors.health.good + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
    savingsText: { fontSize: 11, fontWeight: '800', color: colors.health.good },
    budgetTip: { backgroundColor: colors.surfaceElevated, padding: 12, borderRadius: radius.md, alignItems: 'center' },
    tipText: { fontSize: 11, color: colors.text.secondary, textAlign: 'center' },
});
