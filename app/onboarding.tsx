/**
 * PART:   Onboarding Screen — first-run user enrollment
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  2 — Navigation Shell
 * READS:  AGENTS.md §7, PLAN_B §XI Onboarding UI, store/sessionStore.ts
 * TASK:   Collect name/age/height/weight → auto-login in hackathon mode
 * SCOPE:  IN: form inputs, hackathon auto-login flow
 *         OUT: real auth API (Phase 19), secure token storage (Phase 20)
 */

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSessionStore } from '@/store/sessionStore';
import { useUserStore } from '@/store/userStore';
import { colors, fonts, spacing, radius } from '@/constants/theme';

export default function OnboardingScreen() {
  const router        = useRouter();
  const setTokens     = useSessionStore((s) => s.setTokens);
  const setProfile    = useUserStore((s) => s.setProfile);
  const setIsOnboarded = useUserStore((s) => s.setIsOnboarded);

  const [name,   setName]   = useState('');
  const [age,    setAge]    = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  function handleStart() {
    if (!name.trim()) return;

    // TODO: HACKATHON — replace with real POST /auth/login in Phase 19
    // For now: mock tokens so AuthGuard lets user into tabs
    setProfile({
      id:        'user-mock-001',
      email:     'user@ara-metaboliq.app',
      fullName:  name.trim(),
      age:       parseInt(age) || 25,
      gender:    'other',
      heightCm:  parseFloat(height) || 170,
      weightKg:  parseFloat(weight) || 65,
      timezone:  Intl.DateTimeFormat().resolvedOptions().timeZone,
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
  container:   { flex: 1, backgroundColor: colors.background },
  inner:       { flex: 1 },
  scroll:      { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  hero:        { alignItems: 'center', marginBottom: spacing.xxl },
  logo:        { color: colors.primary, fontSize: 52, fontWeight: '900', letterSpacing: 4 },
  logoSub:     { color: colors.tertiary, fontSize: fonts.sizes.xl, fontWeight: '600', marginTop: -8 },
  tagline:     { color: colors.text.secondary, fontSize: fonts.sizes.md, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
  form:        { gap: spacing.md },
  formTitle:   { color: colors.text.primary, fontSize: fonts.sizes.lg, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    backgroundColor:  colors.surfaceElevated,
    borderRadius:     radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical:  spacing.sm + 4,
    color:            colors.text.primary,
    fontSize:         fonts.sizes.md,
    borderWidth:      1,
    borderColor:      colors.border,
  },
  row:         { flexDirection: 'row', gap: spacing.sm },
  inputHalf:   { flex: 1 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius:    radius.md,
    paddingVertical: spacing.md,
    alignItems:      'center',
    marginTop:       spacing.sm,
  },
  btnDisabled: { opacity: 0.4 },
  btnText:     { color: colors.text.primary, fontSize: fonts.sizes.lg, fontWeight: '700' },
});

