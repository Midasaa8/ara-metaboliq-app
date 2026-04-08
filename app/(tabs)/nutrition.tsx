/**
 * PART:   Nutrition Scanner Screen — UI shell
 * ACTOR:  Gemini 3.1
 * PHASE:  7 — Nutrition Scanner
 * TASK:   Camera capture UI, bill/receipt result display, nutrient table, cost analysis
 * SCOPE:  IN: camera button, result cards, anomaly badges
 *         OUT: GPT-4o API call (Claude Sonnet Phase 7), Z-score logic
 */

import { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '@/constants/theme';

export default function NutritionScreen() {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ])
        ).start();
    }, [pulseAnim]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* ── Top App Bar ── */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity style={styles.menuIconWrapper}>
                        <Ionicons name="menu" size={26} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Nutrition Scan</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.historyBtn}>
                        <Ionicons name="time" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.avatarWrap}>
                        <Ionicons name="person-circle" size={32} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ── Hero Section (Scan Button) ── */}
                <View style={styles.heroSection}>
                    <Animated.View style={[styles.heroScanBtnOuter, { transform: [{ scale: pulseAnim }] }]}>
                        <TouchableOpacity style={styles.heroScanBtn} activeOpacity={0.85}>
                            <Ionicons name="scan" size={48} color="#FFF" style={{ marginBottom: 4 }} />
                            <Text style={styles.heroScanText}>Scan Receipt / Bill</Text>
                        </TouchableOpacity>
                        {/* Badge */}
                        <View style={styles.heroBadge}>
                            <Text style={styles.heroBadgeText}>NEW ENGINE</Text>
                        </View>
                    </Animated.View>
                    <Text style={styles.heroDesc}>Instantly decode your groceries into nutritional intelligence.</Text>
                </View>

                {/* ── Bento Grid ── */}
                <View style={styles.bentoGrid}>

                    {/* PREVIEW CARD */}
                    <View style={[styles.card, styles.previewCard, styles.bentoGlow]}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.cardTitle}>Latest Scan</Text>
                            <Text style={styles.previewTimeLabel}>12:45 PM</Text>
                        </View>
                        <View style={styles.previewImageWrap}>
                            {/* Fake image tint background layer */}
                            <View style={styles.previewFakeBg} />
                            <View style={styles.previewOverlayCenter}>
                                <View style={styles.previewEyeIconWrap}>
                                    <Ionicons name="eye" size={28} color={colors.primary} />
                                </View>
                            </View>
                            <View style={styles.previewInfoFloat}>
                                <Text style={styles.previewMerchantLabel}>MERCHANT</Text>
                                <Text style={styles.previewMerchantValue}>Whole Foods Market</Text>
                            </View>
                        </View>
                    </View>

                    {/* NUTRITION BREAKDOWN */}
                    <View style={[styles.card, styles.nutritionCard, styles.bentoGlow]}>
                        <View style={styles.cardHeaderRow}>
                            <View>
                                <Text style={styles.heroTitle}>Nutrient Intelligence</Text>
                                <Text style={styles.heroSubtitle}>Breakdown of 12 scanned items</Text>
                            </View>
                            <TouchableOpacity style={styles.filterBtn}>
                                <Ionicons name="filter" size={20} color={colors.text.primary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.tableHeader}>
                            <Text style={[styles.colName, styles.tableHeaderLabel]}>Item</Text>
                            <Text style={[styles.colNum, styles.tableHeaderLabel]}>Cals</Text>
                            <Text style={[styles.colNum, styles.tableHeaderLabel]}>Prot</Text>
                            <Text style={[styles.colNum, styles.tableHeaderLabel]}>Carb</Text>
                            <Text style={[styles.colNum, styles.tableHeaderLabel]}>Fats</Text>
                        </View>

                        {/* Table Rows */}
                        {[
                            { n: 'Organic Greek Yogurt', c: 120, p: '18g', ca: '6g', f: '0g', pHi: true },
                            { n: 'Almond Milk (Unsweet)', c: 30, p: '1g', ca: '2g', f: '2.5g' },
                            { n: 'Quinoa (Bulk)', c: 220, p: '8g', ca: '39g', f: '3.5g', caHi: true },
                            { n: 'Grass-fed Ribeye', c: 650, p: '54g', ca: '0g', f: '48g', pHi: true, fHi: true },
                        ].map((r, i) => (
                            <View key={i} style={styles.tableRow}>
                                <Text style={styles.colName} numberOfLines={1}>{r.n}</Text>
                                <Text style={styles.colNum}>{r.c}</Text>
                                <Text style={[styles.colNum, r.pHi && styles.highlightPrimary]}>{r.p}</Text>
                                <Text style={[styles.colNum, r.caHi && styles.highlightTertiary]}>{r.ca}</Text>
                                <Text style={[styles.colNum, r.fHi && styles.highlightSecondary]}>{r.f}</Text>
                            </View>
                        ))}
                    </View>

                    {/* ANOMALY FLAGS */}
                    <View style={[styles.card, styles.anomalyCard, styles.bentoGlow]}>
                        <View style={styles.cardHeaderRow}>
                            <Ionicons name="analytics" size={24} color={colors.secondary} style={{ marginRight: 8 }} />
                            <Text style={[styles.cardTitle, { flex: 1 }]}>Data Insights</Text>
                        </View>

                        {/* Critical */}
                        <View style={styles.alertBox}>
                            <Text style={styles.alertEmoji}>🔴</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.alertCriticalTitle}>Critical Anomaly</Text>
                                <Text style={styles.alertDesc}>Detected "Ultra-Processed" stabilizer in "Organic Greek Yogurt". Discrepancy with clean label claim.</Text>
                            </View>
                        </View>

                        {/* Warning */}
                        <View style={styles.alertBox}>
                            <Text style={styles.alertEmoji}>🟡</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.alertWarningTitle}>Sodium Warning</Text>
                                <Text style={styles.alertDesc}>Ribeye portion contains 110% of your daily recommended sodium intake. Suggesting water intake increase.</Text>
                            </View>
                        </View>
                    </View>

                    {/* COST ANALYSIS */}
                    <View style={[styles.card, styles.budgetCard, styles.bentoGlow]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg }}>
                            <View>
                                <Text style={styles.cardTitle}>Budget Analysis</Text>
                                <Text style={styles.heroSubtitle}>Basket Total: <Text style={{ fontWeight: '700', color: colors.text.primary }}>$84.20</Text></Text>
                            </View>
                            <View style={styles.savingsBadge}>
                                <Text style={styles.savingsBadgeText}>-12% vs Avg</Text>
                            </View>
                        </View>

                        {/* Mini Bar Chart */}
                        <View style={styles.chartArea}>
                            <View style={styles.chartCol}>
                                <View style={[styles.chartBar, { height: '60%', backgroundColor: colors.primary + '40' }]} />
                                <Text style={styles.chartLabel}>Your Cost</Text>
                            </View>
                            <View style={styles.chartCol}>
                                <View style={[styles.chartBar, { height: '100%', backgroundColor: colors.border }]} />
                                <Text style={styles.chartLabel}>Market Avg</Text>
                            </View>
                            <View style={styles.chartCol}>
                                <View style={[styles.chartBar, { height: '85%', backgroundColor: colors.border }]} />
                                <Text style={styles.chartLabel}>Organic Avg</Text>
                            </View>
                        </View>

                        <View style={styles.budgetFooter}>
                            <Text style={styles.budgetFooterText}>
                                You saved <Text style={{ color: colors.tertiary, fontWeight: '800' }}>$11.45</Text> by opting for bulk Quinoa.
                            </Text>
                        </View>
                    </View>

                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// ── Styles (Ethereal Bento) ──
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, height: 60,
        backgroundColor: 'rgba(248, 250, 251, 0.8)',
        borderBottomWidth: 1, borderBottomColor: 'rgba(226, 232, 240, 0.3)',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    menuIconWrapper: { opacity: 0.8 },
    headerTitle: { fontSize: fonts.sizes.lg, fontWeight: '800', color: colors.primary, fontFamily: fonts.bold, letterSpacing: -0.5 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    historyBtn: { opacity: 0.7 },
    avatarWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

    scroll: { flex: 1 },
    scrollContent: { paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: 120 },

    bentoGlow: {
        shadowColor: '#1E293B', shadowOpacity: 0.06, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 5,
    },

    // ── Hero ──
    heroSection: { alignItems: 'center', justifyContent: 'center', marginVertical: spacing.xl },
    heroScanBtnOuter: { position: 'relative', width: 200, height: 200, marginBottom: spacing.lg },
    heroScanBtn: {
        flex: 1, borderRadius: 100, backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }
    },
    heroScanText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    heroBadge: { position: 'absolute', top: 5, right: 0, backgroundColor: colors.tertiary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    heroBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    heroDesc: { textAlign: 'center', color: colors.text.secondary, fontSize: fonts.sizes.sm, paddingHorizontal: 40 },

    // ── Grid System ──
    bentoGrid: { gap: spacing.lg },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text.primary },

    // Preview Card
    previewCard: { padding: spacing.md },
    previewTimeLabel: { color: colors.primary, fontSize: 12, fontWeight: '800' },
    previewImageWrap: { width: '100%', aspectRatio: 3 / 4, backgroundColor: colors.surfaceElevated, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
    previewFakeBg: { position: 'absolute', inset: 0, backgroundColor: 'rgba(100, 116, 139, 0.1)' },
    previewOverlayCenter: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
    previewEyeIconWrap: { backgroundColor: 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    previewInfoFloat: { position: 'absolute', bottom: spacing.sm, left: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: radius.sm, padding: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    previewMerchantLabel: { fontSize: 10, fontWeight: '800', color: colors.text.secondary, opacity: 0.8 },
    previewMerchantValue: { fontSize: 12, fontWeight: '700', color: colors.text.primary },

    // Nutrition Card (Table)
    nutritionCard: {},
    heroTitle: { fontSize: 22, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.5 },
    heroSubtitle: { color: colors.text.secondary, fontSize: 13, marginTop: 2 },
    filterBtn: { backgroundColor: colors.surfaceElevated, padding: 8, borderRadius: 20 },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm, marginTop: spacing.md },
    tableHeaderLabel: { color: colors.text.secondary, fontWeight: '800', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
    tableRow: { flexDirection: 'row', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(226,232,240,0.4)', alignItems: 'center' },
    colName: { flex: 2, fontSize: 13, fontWeight: '600', color: colors.text.primary },
    colNum: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '500', color: colors.text.primary },
    highlightPrimary: { color: colors.primary, fontWeight: '800' },
    highlightTertiary: { color: colors.tertiary, fontWeight: '800' },
    highlightSecondary: { color: colors.secondary, fontWeight: '800' },

    // Anomaly Card
    anomalyCard: {},
    alertBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surfaceElevated, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md, gap: spacing.md },
    alertEmoji: { fontSize: 20, marginTop: -2 },
    alertCriticalTitle: { fontSize: 14, fontWeight: '800', color: colors.health.danger, marginBottom: 4 },
    alertWarningTitle: { fontSize: 14, fontWeight: '800', color: colors.health.warning, marginBottom: 4 },
    alertDesc: { fontSize: 13, color: colors.text.secondary, lineHeight: 18 },

    // Budget Card
    budgetCard: {},
    savingsBadge: { backgroundColor: 'rgba(52, 211, 153, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, justifyContent: 'center' }, // mapped from mockup teritary
    savingsBadgeText: { color: '#047857', fontSize: 11, fontWeight: '800' },
    chartArea: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: spacing.md, paddingHorizontal: spacing.sm },
    chartCol: { flex: 1, alignItems: 'center', gap: spacing.sm, height: '100%', justifyContent: 'flex-end' },
    chartBar: { width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8, opacity: 0.85 },
    chartLabel: { fontSize: 9, fontWeight: '800', color: colors.text.muted, textTransform: 'uppercase', marginBottom: 4 },
    budgetFooter: { marginTop: spacing.xl, backgroundColor: colors.surfaceElevated, paddingVertical: spacing.sm, borderRadius: radius.full, alignItems: 'center' },
    budgetFooterText: { fontSize: 12, color: colors.text.secondary },
});
