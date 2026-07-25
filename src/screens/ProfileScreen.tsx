import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, PostFeedItem, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { signOut } from '../services/authService';
import { fetchPostsByAuthor } from '../services/profileService';
import PostCard from '../components/PostCard';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
  const { profile, session } = useAuth();
  const [posts, setPosts] = useState<PostFeedItem[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setPosts(await fetchPostsByAuthor(session.user.id));
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
        <View style={styles.header}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}
          <Text style={styles.title}>{profile?.display_name ?? 'Perfil'}</Text>
          <Text style={styles.subtitle}>@{profile?.username}</Text>
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Friends')}>
              <Text style={styles.secondaryButtonText}>Amigos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Groups')}>
              <Text style={styles.secondaryButtonText}>Meus grupos</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.button} onPress={() => signOut()}>
            <Text style={styles.buttonText}>Sair</Text>
          </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16, flexGrow: 1 },
  header: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 84, height: 84, borderRadius: 42, marginBottom: 10 },
  avatarPlaceholder: { backgroundColor: '#ccc' },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#666', marginTop: 4 },
  bio: { marginTop: 10, color: '#333', textAlign: 'center' },
  buttonsRow: { flexDirection: 'row', gap: 8, marginTop: 24 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryButtonText: { color: '#1a1a1a', fontSize: 16, fontWeight: '600' },
  button: {
    marginTop: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
