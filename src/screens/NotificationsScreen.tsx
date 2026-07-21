import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, NotificationFeedItem, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchNotifications, markAllAsRead, markAsRead, subscribeToNotifications } from '../services/notificationService';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Notifications'>,
  NativeStackScreenProps<RootStackParamList>
>;

function describe(item: NotificationFeedItem): string {
  switch (item.type) {
    case 'like':
      return `${item.actor_display_name} curtiu seu post`;
    case 'comment':
      return `${item.actor_display_name} comentou no seu post`;
    case 'message':
      return `${item.actor_display_name} te enviou uma mensagem`;
    case 'group_invite':
      return `${item.actor_display_name} te adicionou a um grupo`;
  }
}

export default function NotificationsScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [items, setItems] = useState<NotificationFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setItems(await fetchNotifications());
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
    const unsubscribeFocus = navigation.addListener('focus', load);
    let unsubscribeRealtime = () => {};
    if (session?.user) {
      unsubscribeRealtime = subscribeToNotifications(session.user.id, load);
    }
    return () => {
      unsubscribeFocus();
      unsubscribeRealtime();
    };
  }, [load, navigation, session?.user]);

  async function handlePress(item: NotificationFeedItem) {
    if (!item.read) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
      markAsRead(item.id).catch(() => {});
    }
    if (item.type === 'message') {
      navigation.navigate('Main', { screen: 'Messages' });
    } else if (item.type === 'group_invite') {
      navigation.navigate('Groups');
    } else {
      navigation.navigate('Main', { screen: 'Feed' });
    }
  }

  async function handleMarkAllRead() {
    if (!session?.user) return;
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    await markAllAsRead(session.user.id);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {items.some((i) => !i.read) && (
        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
          <Text style={styles.markAllText}>Marcar tudo como lido</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, !item.read && styles.rowUnread]}
            onPress={() => handlePress(item)}
          >
            <Text style={styles.text}>{describe(item)}</Text>
            <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Nenhuma notificação ainda.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#666', textAlign: 'center' },
  list: { flexGrow: 1, padding: 12 },
  markAllButton: { alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 12 },
  markAllText: { color: '#1a1a1a', fontWeight: '600' },
  row: {
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  rowUnread: { backgroundColor: '#eef4ff' },
  text: { fontSize: 15 },
  timestamp: { color: '#888', fontSize: 12, marginTop: 4 },
});
