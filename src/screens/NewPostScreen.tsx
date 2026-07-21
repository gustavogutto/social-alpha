import React, { useState } from 'react';
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
import type { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { createPost } from '../services/postService';

type Props = NativeStackScreenProps<RootStackParamList, 'NewPost'>;

export default function NewPostScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [content, setContent] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setImageUris((prev) => [...prev, result.assets[0].uri]);
    }
  }

  async function handleSubmit() {
    if (!session?.user) return;
    if (!content.trim() && imageUris.length === 0) {
      setError('Escreva algo ou adicione uma foto.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createPost({ authorId: session.user.id, content: content.trim(), imageUris });
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
        {imageUris.map((uri) => (
          <Image key={uri} source={{ uri }} style={styles.thumbnail} />
        ))}
        <TouchableOpacity style={styles.addImageButton} onPress={handlePickImage}>
          <Text style={styles.addImageText}>+ Foto</Text>
        </TouchableOpacity>
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
