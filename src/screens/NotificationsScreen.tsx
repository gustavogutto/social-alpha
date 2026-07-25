import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, NotificationFeedItem, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchNotifications, markAllAsRead, markAsRead, subscribeToNotifications } from '../services/notificationService';
import { colors } from '../theme/colors';

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
    case 'friend_request':
      return `${item.actor_display_name} quer ser seu amigo`;
    case 'friend_accept':
      return `${item.actor_display_name} aceitou seu pedido de amizade`;
  }
}

export default function NotificationsScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [items, setItems] = useState<NotificationFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setItems(await fetchNotifications());
  }, []);

  const reload = useCallback(() => {
    return load()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível carregar as notificações.'));
  }, [load]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
    const unsubscribeFocus = navigation.addListener('focus', reload);
    let unsubscribeRealtime = () => {};
    if (session?.user) {
      unsubscribeRealtime = subscribeToNotifications(session.user.id, reload);
    }
    return () => {
      unsubscribeFocus();
      unsubscribeRealtime();
    };
  }, [reload, navigation, session?.user]);

  async function handlePress(item: NotificationFeedItem) {
    if (!item.read) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, read: true } : i)));
      markAsRead(item.id).catch(() => {});
    }
    if (item.type === 'message') {
      navigation.navigate('Main', { screen: 'Messages' });
    } else if (item.type === 'group_invite') {
      navigation.navigate('Groups');
    } else if (item.type === 'friend_request' || item.type === 'friend_accept') {
      navigation.navigate('UserProfile', { userId: item.actor_id });
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
    <View style={{ flex: 1, backgroundColor: colors.shell }}>
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
          error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={reload}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Nenhuma notificação ainda.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  errorText: { color: colors.danger, textAlign: 'center', marginBottom: 10 },
  retryText: { color: colors.accent, fontWeight: '600' },
  list: { flexGrow: 1, padding: 12 },
  markAllButton: { alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 12 },
  markAllText: { color: colors.accent, fontWeight: '600' },
  row: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  rowUnread: { backgroundColor: colors.accentSoft },
  text: { fontSize: 15, color: colors.text },
  timestamp: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
});
