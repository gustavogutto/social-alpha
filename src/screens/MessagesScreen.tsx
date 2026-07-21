import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ConversationWithParticipants, MainTabParamList, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchConversations } from '../services/messageService';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Messages'>,
  NativeStackScreenProps<RootStackParamList>
>;

function conversationTitle(conversation: ConversationWithParticipants): string {
  if (conversation.is_group) return conversation.name ?? 'Grupo';
  return conversation.otherParticipants[0]?.display_name ?? 'Conversa';
}

export default function MessagesScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setConversations(await fetchConversations(session.user.id));
  }, [session?.user]);

  useEffect(() => {
    load().finally(() => setLoading(false));
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [load, navigation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              navigation.navigate('Chat', { conversationId: item.id, title: conversationTitle(item) })
            }
          >
            <Text style={styles.title}>{conversationTitle(item)}</Text>
            {item.last_message ? (
              <Text style={styles.preview} numberOfLines={1}>
                {item.last_message}
              </Text>
            ) : (
              <Text style={styles.previewEmpty}>Nenhuma mensagem ainda</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Nenhuma conversa ainda.</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewConversation')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#666', textAlign: 'center' },
  list: { flexGrow: 1, padding: 12 },
  row: {
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: '700' },
  preview: { color: '#666', marginTop: 4 },
  previewEmpty: { color: '#999', marginTop: 4, fontStyle: 'italic' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 28 },
});
