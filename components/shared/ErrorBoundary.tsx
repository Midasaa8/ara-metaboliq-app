/**
 * PART:   Error Boundary — crash-safe wrapper
 * ACTOR:  Gemini 3.1
 * PHASE:  13 — Error Handling
 * TASK:   Show friendly error screen (not white screen of death)
 * SCOPE:  IN: error UI, retry button
 *         OUT: error logging service (Claude Sonnet)
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertCircle, RefreshCcw } from 'lucide-react-native';
import { colors, fonts, spacing, radius, elevation } from '@/constants/theme';

interface Props {
  children: ReactNode;
  screenName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // TODO(Claude Sonnet): Send to error reporting service
    console.error(`[ErrorBoundary] ${this.props.screenName ?? 'Unknown'}:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <View style={s.card}>
            <View style={s.iconWrap}>
              <AlertCircle size={48} color={colors.accent} strokeWidth={1.5} />
            </View>
            <Text style={s.title}>Something went wrong</Text>
            <Text style={s.message}>
              Don't worry — your data is safe.{'\n'}
              Please try again or restart the app.
            </Text>
            {this.state.error && (
              <View style={s.errorBox}>
                <Text style={s.errorText} numberOfLines={3}>
                  {this.state.error.message}
                </Text>
              </View>
            )}
            <TouchableOpacity style={s.retryBtn} onPress={this.handleRetry} activeOpacity={0.85}>
              <RefreshCcw size={18} color="#fff" strokeWidth={2.5} />
              <Text style={s.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl,
    alignItems: 'center', width: '100%', maxWidth: 360, ...elevation.float,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.accent + '15', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fonts.sizes.xl, fontWeight: '800', color: colors.text.primary,
    textAlign: 'center', marginBottom: spacing.sm,
  },
  message: {
    fontSize: fonts.sizes.md, color: colors.text.secondary,
    textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg,
  },
  errorBox: {
    backgroundColor: colors.health.danger + '10', borderRadius: radius.md,
    padding: spacing.md, width: '100%', marginBottom: spacing.lg,
  },
  errorText: { fontSize: fonts.sizes.xs, color: colors.health.danger, fontFamily: 'monospace' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.accent, paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    borderRadius: radius.md, ...elevation.warmGlow,
  },
  retryText: { fontSize: fonts.sizes.md, fontWeight: '700', color: '#fff' },
});
