import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Group, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { createPost } from '../services/postService';
import { fetchMyGroups } from '../services/groupService';

type Props = NativeStackScreenProps<RootStackParamList, 'NewPost'>;

export default function NewPostScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<{ uri: string; mimeType?: string | null }[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMyGroups()
      .then(setGroups)
      .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível carregar os grupos.'));
  }, []);

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Precisamos de permissão para acessar suas fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setImages((prev) => [...prev, { uri: asset.uri, mimeType: asset.mimeType }]);
    }
  }

  async function handleSubmit() {
    if (!session?.user) return;
    if (!content.trim() && images.length === 0) {
      setError('Escreva algo ou adicione uma foto.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createPost({
        authorId: session.user.id,
        content: content.trim(),
        images,
        visibility: selectedGroupId ? 'group' : 'everyone',
        groupId: selectedGroupId,
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível publicar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="No que você está pensando?"
        multiline
        value={content}
        onChangeText={setContent}
      />
      <View style={styles.imageRow}>
        {images.map(({ uri }) => (
          <Image key={uri} source={{ uri }} style={styles.thumbnail} />
        ))}
        <TouchableOpacity style={styles.addImageButton} onPress={handlePickImage}>
          <Text style={styles.addImageText}>+ Foto</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Quem pode ver</Text>
      <View style={styles.visibilityRow}>
        <TouchableOpacity
          style={[styles.chip, selectedGroupId === null && styles.chipActive]}
          onPress={() => setSelectedGroupId(null)}
        >
          <Text style={selectedGroupId === null ? styles.chipTextActive : styles.chipText}>
            Todo mundo
          </Text>
        </TouchableOpacity>
        {groups.map((group) => (
          <TouchableOpacity
            key={group.id}
            style={[styles.chip, selectedGroupId === group.id && styles.chipActive]}
            onPress={() => setSelectedGroupId(group.id)}
          >
            <Text style={selectedGroupId === group.id ? styles.chipTextActive : styles.chipText}>
              {group.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Publicando...' : 'Publicar'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flexGrow: 1, backgroundColor: '#fff' },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  thumbnail: { width: 72, height: 72, borderRadius: 8 },
  addImageButton: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: { fontSize: 12, color: '#666' },
  sectionLabel: { marginTop: 20, marginBottom: 8, fontWeight: '600', color: '#444' },
  visibilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  chipActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  chipText: { color: '#444' },
  chipTextActive: { color: '#fff' },
  button: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#c0392b', marginTop: 12, textAlign: 'center' },
});
