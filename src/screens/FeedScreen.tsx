import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, PostFeedItem, Profile, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { useDemo } from '../context/DemoContext';
import { fetchFeed } from '../services/postService';
import { fetchFriends } from '../services/friendService';
import { DEMO_POSTS, DEMO_PROFILES } from '../demo/demoData';
import PostCard from '../components/PostCard';
import PageContainer from '../components/PageContainer';
import FriendsGrid from '../components/FriendsGrid';
import { colors } from '../theme/colors';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Feed'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function FeedScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { demoMode } = useDemo();
  const [posts, setPosts] = useState<PostFeedItem[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await fetchFeed();
    setPosts(data);
    if (session?.user) {
      fetchFriends(session.user.id)
        .then((rows) => setFriends(rows.map((row) => row.profile)))
        .catch(() => {});
    }
  }, [session?.user]);

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

  const displayedPosts = useMemo(() => {
    if (!demoMode) return posts;
    return [...posts, ...DEMO_POSTS].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [posts, demoMode]);

  const displayedFriends = demoMode ? [...friends, ...DEMO_PROFILES] : friends;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session?.user) return null;

  const sidebar = (
    <View style={styles.sidebarCard}>
      <Text style={styles.sidebarTitle}>Amigos ({displayedFriends.length})</Text>
      <FriendsGrid friends={displayedFriends.slice(0, 9)} emptyText="Você ainda não tem amigos por aqui." />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.shell }}>
      {error && posts.length > 0 ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}
      <PageContainer sidebar={sidebar}>
        <FlatList
          style={styles.flatList}
          data={displayedPosts}
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
      </PageContainer>
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
  flatList: { flex: 1 },
  list: { padding: 12, flexGrow: 1 },
  sidebarCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16 },
  sidebarTitle: { fontWeight: '700', fontSize: 15, color: colors.text, marginBottom: 12 },
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
