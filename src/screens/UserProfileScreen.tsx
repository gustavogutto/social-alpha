import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FriendRelation, Friendship, PostFeedItem, Profile, RecadoFeedItem, RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchProfile, fetchPostsByAuthor } from '../services/profileService';
import {
  fetchFriends,
  fetchFriendshipStatus,
  removeFriendship,
  respondToFriendRequest,
  sendFriendRequest,
} from '../services/friendService';
import { blockUser, isBlockedByMe, unblockUser } from '../services/blockService';
import { submitReport } from '../services/reportService';
import { fetchRecados } from '../services/recadoService';
import { DEMO_POSTS, DEMO_PROFILES } from '../demo/demoData';
import PostCard from '../components/PostCard';
import FriendsGrid from '../components/FriendsGrid';
import PageContainer from '../components/PageContainer';
import RecadosSection from '../components/RecadosSection';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

const REPORT_REASONS = ['Spam', 'Assédio', 'Conteúdo impróprio', 'Outro'];

function relationFromFriendship(friendship: Friendship | null, currentUserId: string): FriendRelation {
  if (!friendship) return 'none';
  if (friendship.status === 'accepted') return 'friends';
  return friendship.requester_id === currentUserId ? 'pending_sent' : 'pending_received';
}

export default function UserProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const { session } = useAuth();
  const currentUserId = session?.user?.id;
  const isSelf = currentUserId === userId;
  const isDemo = userId.startsWith('demo-');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostFeedItem[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [recados, setRecados] = useState<RecadoFeedItem[]>([]);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingUnfriend, setConfirmingUnfriend] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isDemo) {
      const demoProfile = DEMO_PROFILES.find((p) => p.id === userId);
      if (!demoProfile) throw new Error('Perfil de exemplo não encontrado.');
      setProfile(demoProfile);
      setPosts(DEMO_POSTS.filter((p) => p.author_id === userId));
      setFriends(DEMO_PROFILES.filter((p) => p.id !== userId));
      navigation.setOptions({ title: demoProfile.display_name });
      return;
    }

    const [profileData, postsData, friendsData, recadosData] = await Promise.all([
      fetchProfile(userId),
      fetchPostsByAuthor(userId),
      fetchFriends(userId),
      fetchRecados(userId),
    ]);
    setProfile(profileData);
    setPosts(postsData);
    setFriends(friendsData.map((row) => row.profile));
    setRecados(recadosData);
    navigation.setOptions({ title: profileData.display_name });

    if (!isSelf && currentUserId) {
      const [friendshipData, blockedData] = await Promise.all([
        fetchFriendshipStatus(currentUserId, userId),
        isBlockedByMe(currentUserId, userId),
      ]);
      setFriendship(friendshipData);
      setBlocked(blockedData);
    }
  }, [userId, isSelf, isDemo, currentUserId, navigation]);

  const reload = useCallback(() => {
    return load()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível carregar o perfil.'));
  }, [load]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
    const unsubscribe = navigation.addListener('focus', reload);
    return unsubscribe;
  }, [reload, navigation]);

  async function handleFriendAction() {
    if (!currentUserId) return;
    const relation = relationFromFriendship(friendship, currentUserId);
    if (relation === 'friends') {
      setConfirmingUnfriend(true);
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      if (relation === 'none') {
        await sendFriendRequest(currentUserId, userId);
      } else if (relation === 'pending_sent' && friendship) {
        await removeFriendship(friendship.id);
      } else if (relation === 'pending_received' && friendship) {
        await respondToFriendRequest(friendship.id, true);
      }
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível concluir a ação.');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleConfirmUnfriend() {
    if (!friendship) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await removeFriendship(friendship.id);
      setConfirmingUnfriend(false);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível concluir a ação.');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleToggleBlock() {
    if (!currentUserId) return;
    setActionBusy(true);
    setActionError(null);
    try {
      if (blocked) {
        await unblockUser(currentUserId, userId);
      } else {
        await blockUser(currentUserId, userId);
      }
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível concluir a ação.');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleReport(reason: string) {
    if (!currentUserId) return;
    setReportOpen(false);
    try {
      await submitReport({ reporterId: currentUserId, targetType: 'profile', targetId: userId, reason });
      setReportMessage('Denúncia enviada. Obrigado, vamos analisar.');
    } catch (e) {
      setReportMessage(e instanceof Error ? e.message : 'Não foi possível enviar a denúncia.');
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={reload}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!profile) return null;

  const relation = currentUserId ? relationFromFriendship(friendship, currentUserId) : 'none';
  const friendButtonLabel =
    relation === 'none'
      ? 'Adicionar amigo'
      : relation === 'pending_sent'
        ? 'Cancelar pedido'
        : relation === 'pending_received'
          ? 'Aceitar pedido'
          : 'Amigos';

  return (
    <View style={{ flex: 1, backgroundColor: colors.shell }}>
    <PageContainer maxWidth={640}>
    <FlatList
      style={{ flex: 1 }}
      data={posts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}
          <Text style={styles.displayName}>{profile.display_name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          {!isDemo && (
            <Text style={styles.stats}>
              {friends.length} amigos · {posts.length} posts · Desde{' '}
              {new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </Text>
          )}
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          {isDemo && (
            <View style={styles.demoNotice}>
              <Text style={styles.demoNoticeText}>Perfil de exemplo (modo demonstração)</Text>
            </View>
          )}

          {!isSelf && !isDemo && confirmingUnfriend && (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmText}>Remover {profile.display_name} dos seus amigos?</Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity onPress={() => setConfirmingUnfriend(false)} disabled={actionBusy}>
                  <Text style={styles.confirmCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirmUnfriend} disabled={actionBusy}>
                  <Text style={styles.confirmDestructive}>{actionBusy ? 'Removendo...' : 'Remover'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!isSelf && !isDemo && !confirmingUnfriend && (
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.primaryButton} disabled={actionBusy} onPress={handleFriendAction}>
                <Text style={styles.primaryButtonText}>{friendButtonLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} disabled={actionBusy} onPress={handleToggleBlock}>
                <Text style={styles.secondaryButtonText}>{blocked ? 'Desbloquear' : 'Bloquear'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setReportMessage(null);
                  setReportOpen((v) => !v);
                }}
              >
                <Text style={styles.secondaryButtonText}>Denunciar</Text>
              </TouchableOpacity>
            </View>
          )}

          {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

          {reportOpen && (
            <View style={styles.reportRow}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity key={reason} style={styles.reportChip} onPress={() => handleReport(reason)}>
                  <Text style={styles.reportChipText}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {reportMessage ? <Text style={styles.reportMessage}>{reportMessage}</Text> : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.friendsSection}>
            <Text style={styles.sectionTitle}>Amigos</Text>
            <FriendsGrid friends={friends.slice(0, 12)} emptyText="Nenhum amigo ainda." />
          </View>

          {!isDemo && currentUserId && (
            <View style={styles.friendsSection}>
              <Text style={styles.sectionTitle}>Recados</Text>
              <RecadosSection
                profileId={userId}
                currentUserId={currentUserId}
                recados={recados}
                canCompose={!isSelf && relation === 'friends'}
                onPosted={(recado) => setRecados((prev) => [recado, ...prev])}
                onDeleted={(id) => setRecados((prev) => prev.filter((r) => r.id !== id))}
              />
            </View>
          )}

          <Text style={styles.sectionTitle}>Posts</Text>
        </View>
      }
      renderItem={({ item }) =>
        currentUserId ? (
          <PostCard
            post={item}
            currentUserId={currentUserId}
            onDeleted={(postId) => setPosts((prev) => prev.filter((p) => p.id !== postId))}
          />
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Nenhum post visível.</Text>
        </View>
      }
    />
    </PageContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.shell },
  errorText: { color: colors.danger, textAlign: 'center', marginTop: 8 },
  retryText: { color: colors.accent, fontWeight: '600', marginTop: 8 },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  list: { padding: 16, flexGrow: 1, backgroundColor: colors.shell },
  header: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 84, height: 84, borderRadius: 42, marginBottom: 10 },
  avatarPlaceholder: { backgroundColor: colors.placeholder },
  displayName: { fontSize: 20, fontWeight: '700', color: colors.text },
  username: { color: colors.textMuted, marginTop: 2 },
  stats: { color: colors.textMuted, marginTop: 6, fontSize: 13 },
  bio: { marginTop: 10, color: colors.text, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' },
  primaryButton: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18 },
  primaryButtonText: { color: colors.onAccent, fontWeight: '600' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: colors.text, fontWeight: '600' },
  reportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' },
  reportChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  reportChipText: { color: colors.text, fontSize: 13 },
  reportMessage: { color: colors.text, marginTop: 10, textAlign: 'center' },
  confirmRow: { marginTop: 16, alignItems: 'center' },
  confirmText: { fontSize: 14, color: colors.text, textAlign: 'center' },
  confirmButtons: { flexDirection: 'row', gap: 20, marginTop: 10 },
  confirmCancel: { color: colors.textMuted, fontWeight: '600' },
  confirmDestructive: { color: colors.danger, fontWeight: '600' },
  friendsSection: {
    width: '100%',
    marginTop: 20,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: { fontWeight: '700', fontSize: 15, color: colors.text, marginTop: 20, marginBottom: 10 },
  demoNotice: {
    marginTop: 12,
    backgroundColor: colors.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  demoNoticeText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
});
