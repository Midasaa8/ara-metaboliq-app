/**
 * PART:   Onboarding Screen — 6-step progressive enrollment
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  Phase 21s — Onboarding Flow
 * TASK:   6-step onboarding: Auth → Privacy → Profile → Goals → Permissions → Welcome
 *         Smart defaults for VN (165cm, 60kg, 1998). Scroll pickers height/weight.
 * SCOPE:  IN: form, store writes, permission requests
 *         OUT: real OAuth (Phase 34s), real HealthConnect perm (Phase 22s)
 */

import { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, FlatList, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Mail, Check, ChevronRight, ChevronLeft,
  Activity, Moon, Salad, Heart, Mic2, Smile,
} from 'lucide-react-native';
import { useSessionStore } from '@/store/sessionStore';
import { useUserStore } from '@/store/userStore';
import { useTheme } from '@/hooks/useTheme';

const W = Dimensions.get('window').width;
const TOTAL_STEPS = 6;

// ── Scroll-picker data ───────────────────────────────────────────────────────
const HEIGHTS = Array.from({ length: 81 }, (_, i) => 140 + i);   // 140–220 cm
const WEIGHTS = Array.from({ length: 121 }, (_, i) => 30 + i);   // 30–150 kg
const AGES    = Array.from({ length: 83 }, (_, i) => 16 + i);    // 16–98

const GOALS = [
  { key: 'weight_loss',  icon: Activity, label: 'Giảm cân',      color: '#4ECFB5' },
  { key: 'fitness',      icon: Heart,    label: 'Sức bền',        color: '#C1274A' },
  { key: 'stress',       icon: Smile,    label: 'Giảm stress',    color: '#8B5CF6' },
  { key: 'sleep',        icon: Moon,     label: 'Ngủ tốt hơn',   color: '#3B82F6' },
  { key: 'nutrition',    icon: Salad,    label: 'Dinh dưỡng',     color: '#F59E0B' },
  { key: 'voice_screen', icon: Mic2,     label: 'Sàng lọc AI',    color: '#EC4899' },
] as const;

// ── Scroll picker helper ─────────────────────────────────────────────────────
const ITEM_H = 48;
function ScrollPicker({
  data, defaultIdx, onChange, unit, color,
}: {
  data: number[];
  defaultIdx: number;
  onChange: (v: number) => void;
  unit: string;
  color: string;
}) {
  const { colors } = useTheme();
  const ref = useRef<FlatList>(null);
  const [selected, setSelected] = useState(defaultIdx);

  function onScroll(e: any) {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    if (clamped !== selected) {
      setSelected(clamped);
      onChange(data[clamped]);
    }
  }

  return (
    <View style={pk.wrap}>
      <View style={[pk.highlight, { borderColor: color }]} pointerEvents="none" />
      <FlatList
        ref={ref}
        data={data}
        keyExtractor={(v) => String(v)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onScroll}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        initialScrollIndex={defaultIdx}
        getItemLayout={(_, idx) => ({ length: ITEM_H, offset: ITEM_H * idx, index: idx })}
        renderItem={({ item, index }) => (
          <View style={[pk.item, { height: ITEM_H }]}>
            <Text style={[
              pk.itemText,
              { color: index === selected ? color : colors.text.muted,
                fontFamily: index === selected ? 'Nunito_700Bold' : 'Nunito_400Regular',
                fontSize: index === selected ? 22 : 16 },
            ]}>
              {item}{unit}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router   = useRouter();
  const { colors, fonts, spacing, radius } = useTheme();
  const setTokens    = useSessionStore((s) => s.setTokens);
  const setProfile   = useUserStore((s) => s.setProfile);
  const setIsOnboarded = useUserStore((s) => s.setIsOnboarded);

  const [step, setStep]   = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Form state
  const [email,  setEmail]  = useState('');
  const [name,   setName]   = useState('');
  const [gender, setGender] = useState<'male'|'female'|'other'>('other');
  const [age,    setAge]    = useState(28);
  const [height, setHeight] = useState(165);
  const [weight, setWeight] = useState(60);
  const [goals,  setGoals]  = useState<string[]>([]);
  const [privacyOk, setPrivacyOk] = useState(false);

  function animateNext(toStep: number) {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start();
    setStep(toStep);
  }

  const next = useCallback(() => animateNext(Math.min(step + 1, TOTAL_STEPS - 1)), [step]);
  const back = useCallback(() => animateNext(Math.max(step - 1, 0)), [step]);

  function toggleGoal(key: string) {
    setGoals((g) => g.includes(key) ? g.filter((x) => x !== key) : [...g, key]);
  }

  function finish() {
    setProfile({
      id: 'user-' + Date.now(),
      email: email.trim() || 'user@ara-metaboliq.app',
      fullName: name.trim() || 'Người dùng',
      age,
      gender,
      heightCm: height,
      weightKg: weight,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setTokens('mock-access-token', 'mock-refresh-token');
    setIsOnboarded(true);
    router.replace('/(tabs)');
  }

  const canNext = [
    !!email.trim(),            // step 0: email
    privacyOk,                 // step 1: privacy
    !!name.trim(),             // step 2: profile
    goals.length > 0,          // step 3: goals
    true,                      // step 4: permissions (always can skip)
    true,                      // step 5: welcome
  ][step];

  // ── Step renderers ────────────────────────────────────────────────────────
  function renderStep() {
    const pad = spacing.lg;
    switch (step) {

      // ── Step 0: Auth ──
      case 0:
        return (
          <View style={[st.stepContent, { paddingHorizontal: pad }]}>
            <LinearGradient colors={['#C1274A', '#E8688A']} style={[st.logoCard, { borderRadius: 24 }]}>
              <Text style={st.logoText}>ARA</Text>
              <Text style={st.logoSub}>MetaboliQ</Text>
            </LinearGradient>
            <Text style={[st.stepTitle, { color: colors.text.primary, fontFamily: fonts.black }]}>
              Chào mừng bạn 👋
            </Text>
            <Text style={[st.stepDesc, { color: colors.text.muted, fontFamily: fonts.regular }]}>
              Nền tảng AI sức khoẻ dự phòng — không cần phần cứng.
            </Text>
            <View style={[st.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Mail size={18} color={colors.text.muted} strokeWidth={2} />
              <TextInput
                style={[st.textInput, { color: colors.text.primary, fontFamily: fonts.regular }]}
                placeholder="Email của bạn"
                placeholderTextColor={colors.text.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Text style={[st.hintText, { color: colors.text.muted, fontFamily: fonts.regular }]}>
              Hackathon mode — không cần mật khẩu thật
            </Text>
          </View>
        );

      // ── Step 1: Privacy ──
      case 1:
        return (
          <View style={[st.stepContent, { paddingHorizontal: pad }]}>
            <Text style={[st.stepTitle, { color: colors.text.primary, fontFamily: fonts.black }]}>
              Quyền riêng tư 🔒
            </Text>
            <Text style={[st.stepDesc, { color: colors.text.muted, fontFamily: fonts.regular }]}>
              ARA MetaboliQ không chẩn đoán bệnh — chỉ đưa ra "tín hiệu sức khoẻ" giúp bạn theo dõi xu hướng.
            </Text>
            {[
              'Dữ liệu giọng nói xử lý trên server, không lưu raw audio.',
              'Không chia sẻ dữ liệu cá nhân với bên thứ ba.',
              'Bạn có thể xoá tài khoản và toàn bộ dữ liệu bất kỳ lúc nào.',
              'Kết quả phân tích chỉ mang tính THAM KHẢO, không thay thế bác sĩ.',
            ].map((text) => (
              <View key={text} style={st.privacyRow}>
                <View style={[st.checkDot, { backgroundColor: colors.secondary + '20' }]}>
                  <Check size={14} color={colors.secondary} strokeWidth={2.5} />
                </View>
                <Text style={[st.privacyText, { color: colors.text.secondary, fontFamily: fonts.regular }]}>
                  {text}
                </Text>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => setPrivacyOk(!privacyOk)}
              style={[st.consentRow, { borderColor: privacyOk ? colors.secondary : colors.border }]}
            >
              <View style={[st.checkbox, {
                backgroundColor: privacyOk ? colors.secondary : 'transparent',
                borderColor: privacyOk ? colors.secondary : colors.border,
              }]}>
                {privacyOk && <Check size={13} color="#FFF" strokeWidth={3} />}
              </View>
              <Text style={[st.consentText, { color: colors.text.primary, fontFamily: fonts.semibold }]}>
                Tôi đã đọc và đồng ý
              </Text>
            </TouchableOpacity>
          </View>
        );

      // ── Step 2: Profile basics ──
      case 2:
        return (
          <View style={[st.stepContent, { paddingHorizontal: pad }]}>
            <Text style={[st.stepTitle, { color: colors.text.primary, fontFamily: fonts.black }]}>
              Thông tin cơ bản 👤
            </Text>
            <View style={[st.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[st.textInput, { color: colors.text.primary, fontFamily: fonts.regular }]}
                placeholder="Tên của bạn"
                placeholderTextColor={colors.text.muted}
                value={name}
                onChangeText={setName}
                autoCorrect={false}
              />
            </View>
            {/* Gender */}
            <View style={st.genderRow}>
              {(['male','female','other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGender(g)}
                  style={[st.genderChip, {
                    backgroundColor: gender === g ? colors.secondary : colors.surface,
                    borderColor: gender === g ? colors.secondary : colors.border,
                  }]}
                >
                  <Text style={[st.genderText, {
                    color: gender === g ? '#FFF' : colors.text.muted,
                    fontFamily: fonts.semibold,
                  }]}>
                    {g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Scroll pickers */}
            <View style={st.pickersRow}>
              <View style={st.pickerBlock}>
                <Text style={[st.pickerLabel, { color: colors.text.muted, fontFamily: fonts.semibold }]}>Tuổi</Text>
                <ScrollPicker data={AGES} defaultIdx={12} onChange={setAge} unit="" color={colors.primary} />
              </View>
              <View style={st.pickerBlock}>
                <Text style={[st.pickerLabel, { color: colors.text.muted, fontFamily: fonts.semibold }]}>Cao (cm)</Text>
                <ScrollPicker data={HEIGHTS} defaultIdx={25} onChange={setHeight} unit="" color={colors.secondary} />
              </View>
              <View style={st.pickerBlock}>
                <Text style={[st.pickerLabel, { color: colors.text.muted, fontFamily: fonts.semibold }]}>Nặng (kg)</Text>
                <ScrollPicker data={WEIGHTS} defaultIdx={30} onChange={setWeight} unit="" color={colors.accent} />
              </View>
            </View>
          </View>
        );

      // ── Step 3: Goals ──
      case 3:
        return (
          <View style={[st.stepContent, { paddingHorizontal: pad }]}>
            <Text style={[st.stepTitle, { color: colors.text.primary, fontFamily: fonts.black }]}>
              Mục tiêu của bạn 🎯
            </Text>
            <Text style={[st.stepDesc, { color: colors.text.muted, fontFamily: fonts.regular }]}>
              Chọn ít nhất 1 mục tiêu. ARA sẽ cá nhân hoá gợi ý dựa trên lựa chọn của bạn.
            </Text>
            <View style={st.goalsGrid}>
              {GOALS.map(({ key, icon: Icon, label, color }) => {
                const active = goals.includes(key);
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => toggleGoal(key)}
                    activeOpacity={0.8}
                    style={[st.goalChip, {
                      backgroundColor: active ? color + '20' : colors.surface,
                      borderColor: active ? color : colors.border,
                    }]}
                  >
                    <Icon size={22} color={active ? color : colors.text.muted} strokeWidth={2} />
                    <Text style={[st.goalLabel, {
                      color: active ? color : colors.text.secondary,
                      fontFamily: active ? fonts.bold : fonts.regular,
                    }]}>
                      {label}
                    </Text>
                    {active && (
                      <View style={[st.goalCheck, { backgroundColor: color }]}>
                        <Check size={10} color="#FFF" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      // ── Step 4: Permissions ──
      case 4:
        return (
          <View style={[st.stepContent, { paddingHorizontal: pad }]}>
            <Text style={[st.stepTitle, { color: colors.text.primary, fontFamily: fonts.black }]}>
              Quyền truy cập 🎤
            </Text>
            <Text style={[st.stepDesc, { color: colors.text.muted, fontFamily: fonts.regular }]}>
              ARA cần một số quyền để hoạt động tốt nhất. Bạn có thể bật/tắt trong Cài đặt bất kỳ lúc nào.
            </Text>
            {[
              { icon: Mic2,     color: '#C1274A', title: 'Microphone', desc: 'Phân tích giọng nói AI (Voice Check-in)' },
              { icon: Activity, color: '#4ECFB5', title: 'Health Connect', desc: 'Đọc bước chân, nhịp tim, giấc ngủ' },
              { icon: Moon,     color: '#3B82F6', title: 'Thông báo',  desc: 'Nhắc nhở tập luyện & voice check-in' },
            ].map(({ icon: Icon, color, title, desc }) => (
              <View key={title} style={[st.permRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[st.permIcon, { backgroundColor: color + '18' }]}>
                  <Icon size={20} color={color} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.permTitle, { color: colors.text.primary, fontFamily: fonts.semibold }]}>{title}</Text>
                  <Text style={[st.permDesc, { color: colors.text.muted, fontFamily: fonts.regular }]}>{desc}</Text>
                </View>
              </View>
            ))}
            <Text style={[st.hintText, { color: colors.text.muted, fontFamily: fonts.regular, textAlign: 'center' }]}>
              Nhấn Tiếp tục để cấp quyền — hoặc bỏ qua để làm sau
            </Text>
          </View>
        );

      // ── Step 5: Welcome ──
      case 5:
        return (
          <View style={[st.stepContent, { paddingHorizontal: pad, alignItems: 'center' }]}>
            <LinearGradient
              colors={['#4ECFB5', '#38B8A0']}
              style={[st.welcomeCircle, { borderRadius: 9999 }]}
            >
              <Text style={st.welcomeEmoji}>🎉</Text>
            </LinearGradient>
            <Text style={[st.stepTitle, { color: colors.text.primary, fontFamily: fonts.black, textAlign: 'center' }]}>
              Chào {name.trim() || 'bạn'}!
            </Text>
            <Text style={[st.stepDesc, { color: colors.text.muted, fontFamily: fonts.regular, textAlign: 'center' }]}>
              Tài khoản của bạn đã sẵn sàng.{'\n'}
              Bắt đầu bằng Voice Check-in đầu tiên nhé 🎤
            </Text>
            <View style={[st.summaryCard, { backgroundColor: colors.surface }]}>
              {[
                ['Tên', name.trim() || '—'],
                ['Chiều cao', `${height} cm`],
                ['Cân nặng', `${weight} kg`],
                ['Tuổi', `${age}`],
                ['Mục tiêu', `${goals.length} đã chọn`],
              ].map(([label, value]) => (
                <View key={label} style={[st.summaryRow, { borderColor: colors.border }]}>
                  <Text style={[st.summaryLabel, { color: colors.text.muted, fontFamily: fonts.regular }]}>{label}</Text>
                  <Text style={[st.summaryValue, { color: colors.text.primary, fontFamily: fonts.bold }]}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  }

  const isLast = step === TOTAL_STEPS - 1;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Progress bar */}
      <View style={[s.progressWrap, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[s.progressFill, {
            backgroundColor: colors.secondary,
            width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
          }]}
        />
      </View>

      {/* Back button */}
      {step > 0 && (
        <TouchableOpacity onPress={back} style={[s.backBtn, { left: 20 }]}>
          <ChevronLeft size={22} color={colors.text.muted} strokeWidth={2} />
        </TouchableOpacity>
      )}

      {/* Step counter */}
      <Text style={[s.stepCounter, { color: colors.text.muted, fontFamily: fonts.regular }]}>
        {step + 1} / {TOTAL_STEPS}
      </Text>

      {/* Content */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
            {renderStep()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* CTA button */}
      <View style={[s.ctaWrap, { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }]}>
        <TouchableOpacity
          onPress={isLast ? finish : next}
          disabled={!canNext}
          activeOpacity={0.85}
          style={[s.ctaBtn, { opacity: canNext ? 1 : 0.4 }]}
        >
          <LinearGradient
            colors={['#C1274A', '#E8688A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.ctaGrad, { borderRadius: radius.lg }]}
          >
            <Text style={[s.ctaText, { fontFamily: fonts.bold }]}>
              {isLast ? 'Bắt đầu!' : 'Tiếp tục'}
            </Text>
            <ChevronRight size={20} color="#FFF" strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  progressWrap: { height: 3, borderRadius: 2 },
  progressFill: { height: 3, borderRadius: 2 },
  backBtn: {
    position: 'absolute', top: 16, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  stepCounter: { textAlign: 'right', paddingRight: 20, paddingTop: 10, fontSize: 12 },
  scroll: { flexGrow: 1, paddingTop: 8, paddingBottom: 20 },
  ctaWrap: { paddingTop: 12 },
  ctaBtn: { borderRadius: 16, overflow: 'hidden' },
  ctaGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  ctaText: { color: '#FFF', fontSize: 17 },
});

const st = StyleSheet.create({
  stepContent: { paddingTop: 16, gap: 16 },
  logoCard: {
    alignSelf: 'center', paddingHorizontal: 36, paddingVertical: 24,
    alignItems: 'center', marginBottom: 8,
    shadowColor: '#C1274A', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  logoText: { color: '#FFF', fontSize: 48, fontFamily: 'Nunito_900Black', letterSpacing: 4 },
  logoSub: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontFamily: 'Nunito_600SemiBold' },
  stepTitle: { fontSize: 26, marginBottom: 4 },
  stepDesc: { fontSize: 14, lineHeight: 22, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1,
  },
  textInput: { flex: 1, fontSize: 16 },
  hintText: { fontSize: 12, marginTop: -4 },
  // Privacy
  privacyRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkDot: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  privacyText: { flex: 1, fontSize: 13, lineHeight: 20 },
  consentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 14, padding: 14, marginTop: 8,
  },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  consentText: { fontSize: 15 },
  // Profile
  genderRow: { flexDirection: 'row', gap: 8 },
  genderChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  genderText: { fontSize: 14 },
  pickersRow: { flexDirection: 'row', gap: 8 },
  pickerBlock: { flex: 1, alignItems: 'center', gap: 4 },
  pickerLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  // Goals
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalChip: {
    width: (W - 48 - 10) / 2, borderRadius: 16, borderWidth: 1.5,
    padding: 16, gap: 8, position: 'relative',
  },
  goalLabel: { fontSize: 14 },
  goalCheck: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  // Permissions
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  permIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  permTitle: { fontSize: 15 },
  permDesc: { fontSize: 12, marginTop: 2 },
  // Welcome
  welcomeCircle: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  welcomeEmoji: { fontSize: 48 },
  summaryCard: { width: '100%', borderRadius: 16, padding: 16, gap: 2, marginTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13 },
});

const pk = StyleSheet.create({
  wrap: { height: ITEM_H * 5, overflow: 'hidden', width: '100%' },
  highlight: { position: 'absolute', top: ITEM_H * 2, left: 4, right: 4, height: ITEM_H, borderRadius: 10, borderWidth: 2, zIndex: 1, pointerEvents: 'none' },
  item: { alignItems: 'center', justifyContent: 'center' },
  itemText: { letterSpacing: 0.5 },
});


export default function OnboardingScreen() {
  const router = useRouter();
  const setTokens = useSessionStore((s) => s.setTokens);
  const setProfile = useUserStore((s) => s.setProfile);
  const setIsOnboarded = useUserStore((s) => s.setIsOnboarded);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  function handleStart() {
    if (!name.trim()) return;

    // TODO: HACKATHON — replace with real POST /auth/login in Phase 19
    // For now: mock tokens so AuthGuard lets user into tabs
    setProfile({
      id: 'user-mock-001',
      email: 'user@ara-metaboliq.app',
      fullName: name.trim(),
      age: parseInt(age) || 25,
      gender: 'other',
      heightCm: parseFloat(height) || 170,
      weightKg: parseFloat(weight) || 65,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setTokens('mock-access-token', 'mock-refresh-token');
    setIsOnboarded(true);
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo / headline */}
          <View style={styles.hero}>
            <Text style={styles.logo}>ARA</Text>
            <Text style={styles.logoSub}>MetaboliQ</Text>
            <Text style={styles.tagline}>
              Mỗi sáng 10 giây{'\n'}AI hiểu bạn hơn bạn tự hiểu.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Tôi là...</Text>

            <TextInput
              style={styles.input}
              placeholder="Tên của bạn"
              placeholderTextColor={colors.text.muted}
              value={name}
              onChangeText={setName}
              accessibilityLabel="Tên của bạn"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Tuổi"
              placeholderTextColor={colors.text.muted}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              maxLength={3}
              accessibilityLabel="Tuổi"
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Chiều cao (cm)"
                placeholderTextColor={colors.text.muted}
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                maxLength={5}
                accessibilityLabel="Chiều cao"
              />
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Cân nặng (kg)"
                placeholderTextColor={colors.text.muted}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                maxLength={5}
                accessibilityLabel="Cân nặng"
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, !name.trim() && styles.btnDisabled]}
              onPress={handleStart}
              disabled={!name.trim()}
              accessibilityLabel="Bắt đầu"
            >
              <Text style={styles.btnText}>Bắt đầu →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  hero: { alignItems: 'center', marginBottom: spacing.xxl },
  logo: { color: colors.primary, fontSize: 52, fontWeight: '900', letterSpacing: 4 },
  logoSub: { color: colors.accent, fontSize: fonts.sizes.xl, fontWeight: '600', marginTop: -8 },
  tagline: { color: colors.text.secondary, fontSize: fonts.sizes.md, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
  form: { gap: spacing.md },
  formTitle: { color: colors.text.primary, fontSize: fonts.sizes.lg, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.text.primary,
    fontSize: fonts.sizes.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  inputHalf: { flex: 1 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: colors.text.primary, fontSize: fonts.sizes.lg, fontWeight: '700' },
});

