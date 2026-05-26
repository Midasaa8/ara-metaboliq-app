/**
 * PART:   Discover Tab — Articles, Challenges, Guided Programs
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  Phase 20s — Navigation Refactor (placeholder for Phase 31s)
 * TASK:   Discover tab screen with article cards and challenge section stubs.
 *         Full implementation in Phase 31s (Challenges & Social).
 */

import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Trophy, Zap, Heart, Wind, Brain } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

const W = Dimensions.get('window').width;

const ARTICLES = [
  { title: 'Tại sao giọng nói có thể tiết lộ sức khoẻ của bạn?', tag: 'Voice AI', color: '#C1274A', icon: Brain },
  { title: '7 thói quen buổi sáng giúp tối ưu hoá chỉ số sức khoẻ', tag: 'Lifestyle', color: '#4ECFB5', icon: Zap },
  { title: 'Hiểu chỉ số HbA1c trong xét nghiệm máu của bạn', tag: 'Lab Results', color: '#F59E0B', icon: BookOpen },
  { title: 'Stress và giọng nói: Nghiên cứu mới nhất 2026', tag: 'Research', color: '#8B5CF6', icon: Wind },
];

const CHALLENGES = [
  { title: '10,000 bước / ngày', duration: '7 ngày', color: '#4ECFB5', icon: Zap, participants: 1240 },
  { title: 'Voice Check-in streak', duration: '30 ngày', color: '#C1274A', icon: Brain, participants: 432 },
  { title: 'No sugar week', duration: '7 ngày', color: '#F59E0B', icon: Heart, participants: 890 },
];

export default function DiscoverScreen() {
  const { colors, fonts, spacing } = useTheme();
  const pad = spacing.lg;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: 110, paddingHorizontal: pad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={[s.headerTitle, { color: colors.text.primary, fontFamily: fonts.black }]}>
          Discover
        </Text>
        <Text style={[s.headerSub, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          Bài viết, thử thách và chương trình cho bạn
        </Text>

        {/* ── Featured Article ── */}
        <LinearGradient
          colors={['#C1274A', '#E8688A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.featuredCard, { borderRadius: 20 }]}
        >
          <View style={s.featuredTag}>
            <Text style={s.featuredTagText}>★ FEATURED</Text>
          </View>
          <Text style={s.featuredTitle}>MARVEL: AI phân tích 5 tín hiệu sức khoẻ qua giọng nói</Text>
          <Text style={s.featuredSub}>AUROC 0.97 cho Alzheimer's — nghiên cứu 2025</Text>
        </LinearGradient>

        {/* ── Active Challenges ── */}
        <Text style={[s.sectionTitle, { color: colors.text.primary, fontFamily: fonts.bold }]}>
          Challenges đang diễn ra
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -pad }}>
          <View style={[s.challengeRow, { paddingHorizontal: pad }]}>
            {CHALLENGES.map(({ title, duration, color, icon: Icon, participants }) => (
              <TouchableOpacity
                key={title}
                activeOpacity={0.8}
                style={[s.challengeCard, { backgroundColor: colors.surface, borderLeftColor: color }]}
              >
                <View style={[s.challengeIcon, { backgroundColor: color + '20' }]}>
                  <Icon size={20} color={color} strokeWidth={2} />
                </View>
                <Text style={[s.challengeTitle, { color: colors.text.primary, fontFamily: fonts.semibold }]}>
                  {title}
                </Text>
                <Text style={[s.challengeMeta, { color: colors.text.muted, fontFamily: fonts.regular }]}>
                  {duration} · {participants.toLocaleString()} người
                </Text>
                <View style={[s.joinBtn, { backgroundColor: color }]}>
                  <Text style={[s.joinText, { fontFamily: fonts.bold }]}>Tham gia</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* ── Articles ── */}
        <Text style={[s.sectionTitle, { color: colors.text.primary, fontFamily: fonts.bold, marginTop: 8 }]}>
          Bài viết sức khoẻ
        </Text>
        {ARTICLES.map(({ title, tag, color, icon: Icon }) => (
          <TouchableOpacity
            key={title}
            activeOpacity={0.8}
            style={[s.articleCard, { backgroundColor: colors.surface }]}
          >
            <View style={[s.articleIcon, { backgroundColor: color + '18' }]}>
              <Icon size={22} color={color} strokeWidth={2} />
            </View>
            <View style={s.articleBody}>
              <View style={[s.articleTag, { backgroundColor: color + '18' }]}>
                <Text style={[s.articleTagText, { color, fontFamily: fonts.semibold }]}>{tag}</Text>
              </View>
              <Text style={[s.articleTitle, { color: colors.text.primary, fontFamily: fonts.semibold }]}>
                {title}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Coming soon note */}
        <View style={[s.comingSoon, { backgroundColor: colors.surfaceElevated }]}>
          <Trophy size={18} color={colors.text.muted} strokeWidth={2} />
          <Text style={[s.comingSoonText, { color: colors.text.muted, fontFamily: fonts.regular }]}>
            Leaderboards & Social — Phase 31s
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: 20 },
  headerTitle: { fontSize: 28, marginBottom: 4 },
  headerSub: { fontSize: 14, marginBottom: 24 },
  featuredCard: {
    padding: 24, marginBottom: 28,
    shadowColor: '#C1274A', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  featuredTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12,
  },
  featuredTagText: { color: '#FFF', fontSize: 10, fontFamily: 'Nunito_700Bold', letterSpacing: 1 },
  featuredTitle: { color: '#FFF', fontSize: 18, fontFamily: 'Nunito_700Bold', marginBottom: 8, lineHeight: 26 },
  featuredSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: 'Nunito_400Regular' },
  sectionTitle: { fontSize: 18, marginBottom: 14 },
  challengeRow: { flexDirection: 'row', gap: 12, paddingBottom: 8 },
  challengeCard: {
    width: W * 0.55, borderRadius: 16, padding: 16,
    borderLeftWidth: 4, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  challengeIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  challengeTitle: { fontSize: 14, lineHeight: 20 },
  challengeMeta: { fontSize: 12 },
  joinBtn: {
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6, marginTop: 4,
  },
  joinText: { color: '#FFF', fontSize: 12 },
  articleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  articleIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  articleBody: { flex: 1, gap: 6 },
  articleTag: {
    alignSelf: 'flex-start', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  articleTagText: { fontSize: 10, letterSpacing: 0.5 },
  articleTitle: { fontSize: 14, lineHeight: 20 },
  comingSoon: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, padding: 14, marginTop: 12,
  },
  comingSoonText: { fontSize: 13 },
});
