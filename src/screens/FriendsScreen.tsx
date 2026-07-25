import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Friendship, Profile, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchFriends, fetchPendingRequests, fetchSentRequests, removeFriendship, respondToFriendRequest } from '../services/friendService';

type Props = NativeStackScreenProps<RootStackParamList, 'Friends'>;

type Row = { friendship: Friendship; profile: Profile };

export default function FriendsScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [friends, setFriends] = useState<Row[]>([]);
  const [received, setReceived] = useState<Row[]>([]);
  const [sent, setSent] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const [friendsList, receivedList, sentList] = await Promise.all([
      fetchFriends(session.user.id),
      fetchPendingRequests(session.user.id),
      fetchSentRequests(session.user.id),
    ]);
    setFriends(friendsList);
    setReceived(receivedList);
    setSent(sentList);
  }, [session?.user]);

  const reload = useCallback(() => {
    return load()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível carregar seus amigos.'));
  }, [load]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
    const unsubscribe = navigation.addListener('focus', reload);
    return unsubscribe;
  }, [reload, navigation]);

  async function handleAccept(friendshipId: string) {
    setBusyId(friendshipId);
    try {
      await respondToFriendRequest(friendshipId, true);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(friendshipId: string) {
    setBusyId(friendshipId);
    try {
      await respondToFriendRequest(friendshipId, false);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancelOrUnfriend(friendshipId: string) {
    setBusyId(friendshipId);
    try {
      await removeFriendship(friendshipId);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={reload}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {received.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pedidos recebidos</Text>
              {received.map(({ friendship, profile }) => (
                <View key={friendship.id} style={styles.row}>
                  <TouchableOpacity
                    style={styles.identity}
                    onPress={() => navigation.navigate('UserProfile', { userId: profile.id })}
                  >
                    {profile.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]} />
                    )}
                    <Text style={styles.name}>{profile.display_name}</Text>
                  </TouchableOpacity>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      disabled={busyId === friendship.id}
                      onPress={() => handleAccept(friendship.id)}
                    >
                      <Text style={styles.acceptButtonText}>Aceitar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineButton}
                      disabled={busyId === friendship.id}
                      onPress={() => handleDecline(friendship.id)}
                    >
                      <Text style={styles.declineButtonText}>Recusar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {sent.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pedidos enviados</Text>
              {sent.map(({ friendship, profile }) => (
                <View key={friendship.id} style={styles.row}>
                  <TouchableOpacity
                    style={styles.identity}
                    onPress={() => navigation.navigate('UserProfile', { userId: profile.id })}
                  >
                    {profile.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]} />
                    )}
                    <Text style={styles.name}>{profile.display_name}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineButton}
                    disabled={busyId === friendship.id}
                    onPress={() => handleCancelOrUnfriend(friendship.id)}
                  >
                    <Text style={styles.declineButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meus amigos</Text>
            {friends.length === 0 ? (
              <Text style={styles.emptyText}>Você ainda não tem amigos por aqui.</Text>
            ) : (
              friends.map(({ friendship, profile }) => (
                <TouchableOpacity
                  key={friendship.id}
                  style={styles.row}
                  onPress={() => navigation.navigate('UserProfile', { userId: profile.id })}
                >
                  <View style={styles.identity}>
                    {profile.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]} />
                    )}
                    <Text style={styles.name}>{profile.display_name}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { color: '#c0392b', textAlign: 'center', marginBottom: 10 },
  retryText: { color: '#1a1a1a', fontWeight: '600' },
  emptyText: { color: '#666' },
  section: { marginBottom: 24 },
  sectionTitle: { fontWeight: '700', fontSize: 15, marginBottom: 10, color: '#444' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { backgroundColor: '#ccc' },
  name: { fontSize: 15, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  acceptButton: { backgroundColor: '#1a1a1a', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  acceptButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  declineButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  declineButtonText: { color: '#444', fontWeight: '600', fontSize: 13 },
});
