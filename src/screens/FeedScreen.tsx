import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList, PostFeedItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchFeed } from '../services/postService';
import PostCard from '../components/PostCard';
import { colors } from '../theme/colors';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Feed'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function FeedScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [posts, setPosts] = useState<PostFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await fetchFeed();
    setPosts(data);
  }, []);

  const reload = useCallback(() => {
    return load()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível carregar o feed.'));
  }, [load]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
    const unsubscribe = navigation.addListener('focus', reload);
    return unsubscribe;
  }, [reload, navigation]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar o feed.');
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session?.user) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.shell }}>
      {error && posts.length > 0 ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={session.user.id}
            onDeleted={(postId) => setPosts((prev) => prev.filter((p) => p.id !== postId))}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={handleRefresh}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Nenhum post ainda. Seja o primeiro!</Text>
            </View>
          )
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewPost')}>
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
  errorBanner: { backgroundColor: colors.dangerSoft, padding: 10 },
  errorBannerText: { color: colors.danger, textAlign: 'center', fontSize: 13 },
  list: { padding: 12, flexGrow: 1 },
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
