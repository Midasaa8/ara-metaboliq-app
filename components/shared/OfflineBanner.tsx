/**
 * PART:   Offline Banner — network status indicator
 * ACTOR:  Gemini 3.1
 * PHASE:  13 — Error Handling
 * TASK:   Show "No internet" banner when offline
 * SCOPE:  IN: banner UI with warm amber tint
 *         OUT: network detection logic (uses NetInfo or manual check)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '@/constants/theme';

export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(false);
    const slideAnim = useState(() => new Animated.Value(-60))[0];

    useEffect(() => {
        // Simple online/offline check (works in Expo Go)
        // TODO(Claude Sonnet): Replace with @react-native-community/netinfo
        const checkConnection = async () => {
            try {
                const response = await fetch('https://httpbin.org/get', { method: 'HEAD' });
                if (!response.ok) throw new Error();
                setIsOffline(false);
            } catch {
                setIsOffline(true);
            }
        };

        checkConnection();
        const interval = setInterval(checkConnection, 15_000); // Re-check every 15s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: isOffline ? 0 : -60,
            useNativeDriver: true,
            tension: 40,
            friction: 8,
        }).start();
    }, [isOffline, slideAnim]);

    return (
        <Animated.View style={[s.banner, { transform: [{ translateY: slideAnim }] }]}>
            <Ionicons name="cloud-offline" size={16} color={colors.health.warning} />
            <Text style={s.text}>No internet connection</Text>
        </Animated.View>
    );
}

const s = StyleSheet.create({
    banner: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
        backgroundColor: '#FFF8E1', // Warm amber tint
        borderBottomWidth: 1, borderBottomColor: colors.health.warning + '30',
    },
    text: {
        fontSize: fonts.sizes.sm, fontWeight: '600', color: colors.health.warning,
    },
});
