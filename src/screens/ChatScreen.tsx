import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Message, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchMessages, sendMessage, subscribeToMessages } from '../services/messageService';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ route, navigation }: Props) {
  const { conversationId, title } = route.params;
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    fetchMessages(conversationId)
      .then((data) => {
        setMessages(data);
        setLoadError(null);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Não foi possível carregar as mensagens.'));

    const unsubscribe = subscribeToMessages(conversationId, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    });
    return unsubscribe;
  }, [conversationId]);

  async function handleSend() {
    const content = text.trim();
    if (!content || !session?.user) return;
    setSendError(null);
    setSending(true);
    try {
      const message = await sendMessage(conversationId, session.user.id, content);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      setText('');
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.shell }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {loadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{loadError}</Text>
        </View>
      ) : null}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.sender_id === session?.user?.id;
          return (
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>{item.content}</Text>
            </View>
          );
        }}
      />
      {sendError ? <Text style={styles.sendErrorText}>{sendError}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Escreva uma mensagem..."
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          editable={!sending}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton} disabled={sending}>
          <Text style={styles.sendButtonText}>{sending ? '...' : 'Enviar'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, flexGrow: 1 },
  bubble: { maxWidth: '80%', borderRadius: 14, padding: 10, marginBottom: 8 },
  bubbleMine: { backgroundColor: colors.accent, alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: colors.card, alignSelf: 'flex-start' },
  bubbleText: { color: colors.text },
  bubbleTextMine: { color: colors.onAccent },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.card,
    color: colors.text,
  },
  sendButton: { paddingHorizontal: 12 },
  sendButtonText: { color: colors.accent, fontWeight: '700' },
  errorBanner: { backgroundColor: colors.dangerSoft, padding: 10 },
  errorBannerText: { color: colors.danger, textAlign: 'center', fontSize: 13 },
  sendErrorText: { color: colors.danger, textAlign: 'center', fontSize: 13, paddingTop: 6 },
});
