/**
 * PART:   ErrorBoundary — screen-level crash guard
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  12 — Integration + Crash Guard
 * READS:  AGENTS.md §7, SONNET_PHASES.md §PHASE 14 (Error Handling)
 * TASK:   Catch any React render error per-screen, show recovery UI
 * SCOPE:  IN: wrapping individual screens inside tab layout
 *         OUT: global crash reporting (Phase 14: ErrorReporter.ts)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
  screenName?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message ?? 'Unknown error',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Phase 14: send to ErrorReporter.ts here
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="alert-circle-outline" size={56} color="#DC2626" />
          <Text style={styles.title}>Màn hình gặp lỗi</Text>
          <Text style={styles.screen}>
            {this.props.screenName ?? 'Screen'}
          </Text>
          <Text style={styles.message} numberOfLines={3}>
            {this.state.errorMessage}
          </Text>
          <TouchableOpacity style={styles.btn} onPress={this.handleReset} activeOpacity={0.8}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.btnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFB',
    padding: 32,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8,
  },
  screen: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  message: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    fontFamily: 'monospace',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 9999,
    marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
