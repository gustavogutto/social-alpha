import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList, StoryGroup } from '../types';
import { useAuth } from '../context/AuthContext';
import { createStory, fetchActiveStories } from '../services/storyService';
import { colors } from '../theme/colors';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Stories'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function StoriesScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setGroups(await fetchActiveStories());
  }, []);

  const reload = useCallback(() => {
    return load()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível carregar os stories.'));
  }, [load]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
    const unsubscribe = navigation.addListener('focus', reload);
    return unsubscribe;
  }, [reload, navigation]);

  async function handleAddStory() {
    if (!session?.user) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    setPosting(true);
    setError(null);
    try {
      const asset = result.assets[0];
      await createStory({
        authorId: session.user.id,
        uri: asset.uri,
        mediaType: asset.type === 'video' ? 'video' : 'image',
        mimeType: asset.mimeType,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível publicar o story.');
    } finally {
      setPosting(false);
    }
  }

  const myGroup = groups.find((g) => g.authorId === session?.user?.id);
  const otherGroups = groups.filter((g) => g.authorId !== session?.user?.id);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.shell }}>
      <ScrollView horizontal contentContainerStyle={styles.row} showsHorizontalScrollIndicator={false}>
        <TouchableOpacity style={styles.bubbleWrap} onPress={handleAddStory} disabled={posting}>
          <View style={styles.addBubble}>
            {posting ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.addBubbleText}>+</Text>}
          </View>
          <Text style={styles.bubbleLabel} numberOfLines={1}>
            {myGroup ? 'Adicionar' : 'Seu story'}
          </Text>
        </TouchableOpacity>

        {myGroup && (
          <TouchableOpacity
            style={styles.bubbleWrap}
            onPress={() => navigation.navigate('StoryViewer', { group: myGroup })}
          >
            {myGroup.authorAvatarUrl ? (
              <Image source={{ uri: myGroup.authorAvatarUrl }} style={styles.bubble} />
            ) : (
              <View style={[styles.bubble, styles.bubblePlaceholder]} />
            )}
            <Text style={styles.bubbleLabel} numberOfLines={1}>
              Você
            </Text>
          </TouchableOpacity>
        )}

        {otherGroups.map((group) => (
          <TouchableOpacity
            key={group.authorId}
            style={styles.bubbleWrap}
            onPress={() => navigation.navigate('StoryViewer', { group })}
          >
            {group.authorAvatarUrl ? (
              <Image source={{ uri: group.authorAvatarUrl }} style={styles.bubble} />
            ) : (
              <View style={[styles.bubble, styles.bubblePlaceholder]} />
            )}
            <Text style={styles.bubbleLabel} numberOfLines={1}>
              {group.authorDisplayName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={reload}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        groups.length === 0 && (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Nenhum story nas últimas 24h. Seja o primeiro!</Text>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  errorText: { color: colors.danger, textAlign: 'center', marginBottom: 10 },
  retryText: { color: colors.accent, fontWeight: '600' },
  row: { flexDirection: 'row', padding: 16, gap: 16 },
  bubbleWrap: { alignItems: 'center', width: 68 },
  bubble: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: colors.accent },
  bubblePlaceholder: { backgroundColor: colors.placeholder },
  addBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  addBubbleText: { fontSize: 28, color: colors.textMuted, lineHeight: 28 },
  bubbleLabel: { fontSize: 12, marginTop: 4, textAlign: 'center', color: colors.text },
});
