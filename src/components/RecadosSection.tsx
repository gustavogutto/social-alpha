import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { RecadoFeedItem } from '../types';
import { deleteRecado, postRecado } from '../services/recadoService';
import { colors } from '../theme/colors';

export default function RecadosSection({
  profileId,
  currentUserId,
  recados,
  canCompose,
  onPosted,
  onDeleted,
}: {
  profileId: string;
  currentUserId: string;
  recados: RecadoFeedItem[];
  canCompose: boolean;
  onPosted: (recado: RecadoFeedItem) => void;
  onDeleted: (recadoId: string) => void;
}) {
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePost() {
    const content = text.trim();
    if (!content) return;
    setPosting(true);
    setError(null);
    try {
      await postRecado(profileId, currentUserId, content);
      onPosted({
        id: `pending-${Date.now()}`,
        profile_id: profileId,
        author_id: currentUserId,
        content,
        created_at: new Date().toISOString(),
        author_username: '',
        author_display_name: 'Você',
        author_avatar_url: null,
      });
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível deixar o recado.');
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(recadoId: string) {
    try {
      await deleteRecado(recadoId);
      onDeleted(recadoId);
    } catch {
      // best-effort - if it fails the row just stays visible
    }
  }

  return (
    <View>
      {canCompose && (
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Deixe um recado..."
            value={text}
            onChangeText={setText}
            multiline
            editable={!posting}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity style={styles.postButton} onPress={handlePost} disabled={posting}>
            <Text style={styles.postButtonText}>{posting ? 'Enviando...' : 'Enviar recado'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {recados.length === 0 ? (
        <Text style={styles.emptyText}>Nenhum recado ainda.</Text>
      ) : (
        recados.map((recado) => (
          <View key={recado.id} style={styles.recadoRow}>
            {recado.author_avatar_url ? (
              <Image source={{ uri: recado.author_avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.recadoHeader}>
                <Text style={styles.authorName}>{recado.author_display_name}</Text>
                {!recado.id.startsWith('demo-') &&
                  (currentUserId === profileId || currentUserId === recado.author_id) && (
                    <TouchableOpacity onPress={() => handleDelete(recado.id)}>
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  )}
              </View>
              <Text style={styles.content}>{recado.content}</Text>
              <Text style={styles.timestamp}>{new Date(recado.created_at).toLocaleString()}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  composer: { marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
    color: colors.text,
    backgroundColor: colors.card,
  },
  errorText: { color: colors.danger, marginTop: 6, fontSize: 12 },
  postButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  postButtonText: { color: colors.onAccent, fontWeight: '600' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  recadoRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { backgroundColor: colors.placeholder },
  recadoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  authorName: { fontWeight: '700', color: colors.text, fontSize: 13 },
  deleteText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  content: { color: colors.text, fontSize: 14, marginTop: 2 },
  timestamp: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
});
