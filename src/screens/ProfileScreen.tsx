import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, PostFeedItem, Profile, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../services/authService';
import { fetchPostsByAuthor } from '../services/profileService';
import { fetchFriends } from '../services/friendService';
import PostCard from '../components/PostCard';
import FriendsGrid from '../components/FriendsGrid';
import { colors } from '../theme/colors';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const { profile, session } = useAuth();
  const [posts, setPosts] = useState<PostFeedItem[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const [postsData, friendsData] = await Promise.all([
      fetchPostsByAuthor(session.user.id),
      fetchFriends(session.user.id),
    ]);
    setPosts(postsData);
    setFriends(friendsData.map((row) => row.profile));
  }, [session?.user]);

  useEffect(() => {
    load().catch(() => {});
    const unsubscribe = navigation.addListener('focus', () => load().catch(() => {}));
    return unsubscribe;
  }, [load, navigation]);

  return (
    <FlatList
      style={styles.container}
      data={posts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View>
          <View style={styles.banner} />
          <View style={styles.header}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
            <Text style={styles.title}>{profile?.display_name ?? 'Perfil'}</Text>
            <Text style={styles.subtitle}>@{profile?.username}</Text>
            {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Groups')}>
              <Text style={styles.secondaryButtonText}>Meus grupos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => signOut()}>
              <Text style={styles.buttonText}>Sair</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.friendsSection}>
            <Text style={styles.sectionTitle}>Amigos</Text>
            <FriendsGrid
              friends={friends.slice(0, 12)}
              emptyText="Você ainda não tem amigos por aqui."
              onSeeAll={() => navigation.navigate('Friends')}
            />
          </View>

          <Text style={styles.sectionTitle}>Meus posts</Text>
        </View>
      }
      renderItem={({ item }) =>
        session?.user ? (
          <PostCard
            post={item}
            currentUserId={session.user.id}
            onDeleted={(postId) => setPosts((prev) => prev.filter((p) => p.id !== postId))}
          />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.shell },
  list: { paddingBottom: 16, flexGrow: 1 },
  banner: { height: 90, backgroundColor: colors.accentSoft },
  header: { alignItems: 'center', marginTop: -42, paddingHorizontal: 16 },
  avatar: { width: 84, height: 84, borderRadius: 42, marginBottom: 10, borderWidth: 3, borderColor: colors.shell },
  avatarPlaceholder: { backgroundColor: colors.placeholder },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 4 },
  bio: { marginTop: 10, color: colors.text, textAlign: 'center' },
  secondaryButton: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryButtonText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  button: {
    marginTop: 12,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  buttonText: { color: colors.onAccent, fontSize: 16, fontWeight: '600' },
  friendsSection: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: { fontWeight: '700', fontSize: 15, color: colors.text, marginBottom: 10, marginHorizontal: 16 },
});
