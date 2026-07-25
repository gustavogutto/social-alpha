import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ConversationWithParticipants, MainTabParamList, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchConversations } from '../services/messageService';
import PageContainer from '../components/PageContainer';
import { colors } from '../theme/colors';

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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setConversations(await fetchConversations(session.user.id));
  }, [session?.user]);

  const reload = useCallback(() => {
    return load()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível carregar as conversas.'));
  }, [load]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
    const unsubscribe = navigation.addListener('focus', reload);
    return unsubscribe;
  }, [reload, navigation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.shell }}>
      <PageContainer>
        <FlatList
          style={styles.flatList}
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
            error ? (
              <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={reload}>
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.centered}>
                <Text style={styles.emptyText}>Nenhuma conversa ainda.</Text>
              </View>
            )
          }
        />
      </PageContainer>
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewConversation')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  errorText: { color: colors.danger, textAlign: 'center', marginBottom: 10 },
  retryText: { color: colors.accent, fontWeight: '600' },
  flatList: { flex: 1 },
  list: { flexGrow: 1, padding: 12 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  preview: { color: colors.textMuted, marginTop: 4 },
  previewEmpty: { color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: colors.onAccent, fontSize: 28, lineHeight: 28 },
});
