import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList, PostFeedItem, Comment } from '../types';
import { useAuth } from '../context/AuthContext';
import { addComment, fetchComments, fetchFeed, setLiked } from '../services/postService';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Feed'>,
  NativeStackScreenProps<RootStackParamList>
>;

function PostCard({ post, currentUserId }: { post: PostFeedItem; currentUserId: string }) {
  const [liked, setLikedState] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    setLikedState(post.liked_by_me);
    setLikeCount(post.like_count);
    setCommentCount(post.comment_count);
  }, [post.liked_by_me, post.like_count, post.comment_count]);

  async function handleToggleLike() {
    const next = !liked;
    setLikedState(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      await setLiked(post.id, currentUserId, next);
    } catch {
      setLikedState(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  async function handleToggleComments() {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments.length === 0) {
      setLoadingComments(true);
      try {
        setComments(await fetchComments(post.id));
      } finally {
        setLoadingComments(false);
      }
    }
  }

  async function handleAddComment() {
    const text = newComment.trim();
    if (!text) return;
    setCommentError(null);
    setSendingComment(true);
    try {
      const comment = await addComment(post.id, currentUserId, text);
      setComments((prev) => [...prev, comment]);
      setCommentCount((c) => c + 1);
      setNewComment('');
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : 'Não foi possível comentar.');
    } finally {
      setSendingComment(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {post.author_avatar_url ? (
          <Image source={{ uri: post.author_avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        )}
        <View>
          <Text style={styles.authorName}>{post.author_display_name}</Text>
          <Text style={styles.timestamp}>{new Date(post.created_at).toLocaleString()}</Text>
        </View>
        {post.group_name ? (
          <View style={styles.groupBadge}>
            <Text style={styles.groupBadgeText}>{post.group_name}</Text>
          </View>
        ) : null}
      </View>
      {post.content ? <Text style={styles.content}>{post.content}</Text> : null}
      {post.media_urls.map((url) => (
        <Image key={url} source={{ uri: url }} style={styles.postImage} />
      ))}
      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={handleToggleLike}>
          <Text style={liked ? styles.actionActive : styles.action}>
            {liked ? '♥' : '♡'} {likeCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleToggleComments}>
          <Text style={styles.action}>💬 {commentCount}</Text>
        </TouchableOpacity>
      </View>
      {commentsOpen && (
        <View style={styles.commentsSection}>
          {loadingComments ? (
            <ActivityIndicator />
          ) : (
            comments.map((c) => (
              <Text key={c.id} style={styles.comment}>
                {c.content}
              </Text>
            ))
          )}
          {commentError ? <Text style={styles.errorText}>{commentError}</Text> : null}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Escreva um comentário..."
              value={newComment}
              onChangeText={setNewComment}
              onSubmitEditing={handleAddComment}
              editable={!sendingComment}
            />
            <TouchableOpacity onPress={handleAddComment} disabled={sendingComment}>
              <Text style={styles.sendComment}>{sendingComment ? '...' : 'Enviar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

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

  useEffect(() => {
    load()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível carregar o feed.'))
      .finally(() => setLoading(false));
  }, [load]);

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
    <View style={{ flex: 1 }}>
      {error && posts.length > 0 ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <PostCard post={item} currentUserId={session.user.id} />}
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
  emptyText: { color: '#666', textAlign: 'center' },
  errorText: { color: '#c0392b', textAlign: 'center', marginBottom: 10 },
  retryText: { color: '#1a1a1a', fontWeight: '600' },
  errorBanner: { backgroundColor: '#fdecea', padding: 10 },
  errorBannerText: { color: '#c0392b', textAlign: 'center', fontSize: 13 },
  list: { padding: 12, flexGrow: 1 },
  card: {
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { backgroundColor: '#ccc' },
  authorName: { fontWeight: '700' },
  timestamp: { color: '#888', fontSize: 12 },
  groupBadge: {
    marginLeft: 'auto',
    backgroundColor: '#e5e5e5',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  groupBadgeText: { fontSize: 12, color: '#444' },
  content: { fontSize: 15, marginBottom: 8 },
  postImage: { width: '100%', height: 220, borderRadius: 10, marginBottom: 8 },
  actionsRow: { flexDirection: 'row', gap: 20, marginTop: 4 },
  action: { color: '#444' },
  actionActive: { color: '#c0392b' },
  commentsSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#e5e5e5', paddingTop: 8 },
  comment: { fontSize: 14, marginBottom: 4 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sendComment: { color: '#1a1a1a', fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 28 },
});
