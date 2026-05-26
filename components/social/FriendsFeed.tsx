/**
 * PART:   FriendsFeed — friends activity timeline
 * ACTOR:  Claude Sonnet 4.6
 * PHASE:  31s — Challenges & Social
 * TASK:   Chronological feed of friend activities with relative timestamps
 * SCOPE:  IN: FriendActivity[] from FriendsService
 *         OUT: none (display only)
 */

import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import type { FriendActivity } from '@/services/social/FriendsService';

interface Props {
  feed: FriendActivity[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

const TYPE_COLOR: Record<FriendActivity['type'], string> = {
  run:       '#4ECFB5',
  steps:     '#2563EB',
  sleep:     '#8B5CF6',
  challenge: '#F59E0B',
  badge:     '#EF4444',
};

function FeedItem({ item }: { item: FriendActivity }) {
  const { colors, fonts } = useTheme();
  const accent = TYPE_COLOR[item.type];
  return (
    <View style={[s.item, { borderLeftColor: accent }]}>
      <Text style={s.avatar}>{item.avatarEmoji}</Text>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[s.msg, { color: colors.text.primary, fontFamily: fonts.regular }]}>
          <Text style={{ fontFamily: fonts.bold }}>{item.friendName}</Text> {item.message}
        </Text>
        <Text style={[s.time, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          {timeAgo(item.timestamp)}
        </Text>
      </View>
    </View>
  );
}

export function FriendsFeed({ feed }: Props) {
  const { colors, fonts } = useTheme();

  if (!feed.length) {
    return (
      <View style={[s.empty, { backgroundColor: colors.surfaceElevated, borderRadius: 14 }]}>
        <Text style={[s.emptyText, { color: colors.text.muted, fontFamily: fonts.regular }]}>
          Chưa có hoạt động từ bạn bè
        </Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Text style={[s.header, { color: colors.text.primary, fontFamily: fonts.bold }]}>
        Hoạt động bạn bè
      </Text>
      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedItem item={item} />}
        contentContainerStyle={{ gap: 10 }}
        scrollEnabled={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 12 },
  header: { fontSize: 15 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 4 },
  avatar: { fontSize: 24, marginTop: -2 },
  msg: { fontSize: 13, lineHeight: 18 },
  time: { fontSize: 11 },
  empty: { height: 70, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13 },
});
