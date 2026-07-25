import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, PostFeedItem, Profile, RecadoFeedItem, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { useDemo } from '../context/DemoContext';
import { signOut } from '../services/authService';
import { fetchPostsByAuthor } from '../services/profileService';
import { fetchFriends } from '../services/friendService';
import { fetchRecados } from '../services/recadoService';
import { DEMO_PROFILES } from '../demo/demoData';
import PostCard from '../components/PostCard';
import FriendsGrid from '../components/FriendsGrid';
import PageContainer from '../components/PageContainer';
import OrkutColumns from '../components/OrkutColumns';
import RecadosSection from '../components/RecadosSection';
import { colors } from '../theme/colors';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const { profile, session } = useAuth();
  const { demoMode, setDemoMode } = useDemo();
  const [posts, setPosts] = useState<PostFeedItem[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [recados, setRecados] = useState<RecadoFeedItem[]>([]);
  const displayedFriends = demoMode ? [...friends, ...DEMO_PROFILES] : friends;

  const load = useCallback(async () => {
    if (!session?.user) return;
    const [postsData, friendsData, recadosData] = await Promise.all([
      fetchPostsByAuthor(session.user.id),
      fetchFriends(session.user.id),
      fetchRecados(session.user.id),
    ]);
    setPosts(postsData);
    setFriends(friendsData.map((row) => row.profile));
    setRecados(recadosData);
  }, [session?.user]);

  useEffect(() => {
    load().catch(() => {});
    const unsubscribe = navigation.addListener('focus', () => load().catch(() => {}));
    return unsubscribe;
  }, [load, navigation]);

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageContainer maxWidth={1000}>
          <OrkutColumns
            left={
              <View style={styles.card}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]} />
                )}
                <Text style={styles.name}>{profile?.display_name ?? 'Perfil'}</Text>
                <Text style={styles.username}>@{profile?.username}</Text>

                <View style={styles.statList}>
                  <Text style={styles.statLine}>
                    <Text style={styles.statNumber}>{friends.length}</Text> amigos
                  </Text>
                  <Text style={styles.statLine}>
                    <Text style={styles.statNumber}>{posts.length}</Text> posts
                  </Text>
                  <Text style={styles.statLine}>Desde {memberSince}</Text>
                </View>

                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Groups')}>
                  <Text style={styles.actionButtonText}>Meus grupos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Friends')}>
                  <Text style={styles.actionButtonText}>Amigos e pedidos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.signOutButton]} onPress={() => signOut()}>
                  <Text style={styles.signOutButtonText}>Sair</Text>
                </TouchableOpacity>

                <View style={styles.demoRow}>
                  <Text style={styles.demoLabel}>Modo demonstração</Text>
                  <Switch
                    value={demoMode}
                    onValueChange={setDemoMode}
                    trackColor={{ true: colors.accent, false: colors.border }}
                  />
                </View>
              </View>
            }
            center={
              <>
                {profile?.bio ? (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Sobre</Text>
                    <Text style={styles.bio}>{profile.bio}</Text>
                  </View>
                ) : null}

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Recados</Text>
                  {session?.user ? (
                    <RecadosSection
                      profileId={session.user.id}
                      currentUserId={session.user.id}
                      recados={recados}
                      canCompose={false}
                      onPosted={() => {}}
                      onDeleted={(id) => setRecados((prev) => prev.filter((r) => r.id !== id))}
                    />
                  ) : null}
                </View>

                <Text style={styles.postsHeading}>Meus posts</Text>
                {posts.length === 0 ? (
                  <Text style={styles.emptyText}>Você ainda não postou nada.</Text>
                ) : (
                  posts.map((item) =>
                    session?.user ? (
                      <PostCard
                        key={item.id}
                        post={item}
                        currentUserId={session.user.id}
                        onDeleted={(postId) => setPosts((prev) => prev.filter((p) => p.id !== postId))}
                      />
                    ) : null
                  )
                )}
              </>
            }
            right={
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Amigos ({displayedFriends.length})</Text>
                <FriendsGrid
                  friends={displayedFriends.slice(0, 12)}
                  emptyText="Você ainda não tem amigos por aqui."
                  onSeeAll={() => navigation.navigate('Friends')}
                />
              </View>
            }
          />
        </PageContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.shell },
  scroll: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  avatar: { width: 140, height: 140, borderRadius: 70, alignSelf: 'center', marginBottom: 12 },
  avatarPlaceholder: { backgroundColor: colors.placeholder },
  name: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  username: { color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  statList: { marginTop: 14, gap: 4 },
  statLine: { fontSize: 13, color: colors.textMuted },
  statNumber: { color: colors.accent, fontWeight: '700' },
  actionButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 12,
  },
  actionButtonText: { color: colors.accent, fontWeight: '600', fontSize: 13 },
  signOutButton: { borderColor: colors.border },
  signOutButtonText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  demoLabel: { fontSize: 12, color: colors.textMuted, flex: 1, marginRight: 8 },
  sectionTitle: { fontWeight: '700', fontSize: 15, color: colors.text, marginBottom: 10 },
  bio: { color: colors.text, fontSize: 14 },
  postsHeading: { fontWeight: '700', fontSize: 15, color: colors.text, marginBottom: 12, marginTop: 4 },
  emptyText: { color: colors.textMuted },
});
