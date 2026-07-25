import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Comment, PostFeedItem, RootStackParamList } from '../types';
import { addComment, deletePost, fetchComments, setLiked } from '../services/postService';
import { colors } from '../theme/colors';

const VISIBILITY_LABEL: Record<PostFeedItem['visibility'], string> = {
  everyone: '',
  group: '',
  friends: 'Amigos',
};

export default function PostCard({
  post,
  currentUserId,
  onDeleted,
}: {
  post: PostFeedItem;
  currentUserId: string;
  onDeleted?: (postId: string) => void;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isDemo = post.id.startsWith('demo-');
  const [liked, setLikedState] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [sendingComment, setSendingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setLikedState(post.liked_by_me);
    setLikeCount(post.like_count);
    setCommentCount(post.comment_count);
  }, [post.liked_by_me, post.like_count, post.comment_count]);

  async function handleToggleLike() {
    const next = !liked;
    setLikedState(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    if (isDemo) return;
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
    if (next && comments.length === 0 && !isDemo) {
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
    if (isDemo) {
      setComments((prev) => [
        ...prev,
        { id: `demo-comment-${Date.now()}`, post_id: post.id, author_id: currentUserId, content: text, created_at: new Date().toISOString() },
      ]);
      setCommentCount((c) => c + 1);
      setNewComment('');
      return;
    }
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

  async function handleConfirmDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deletePost(post.id, currentUserId);
      onDeleted?.(post.id);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Não foi possível excluir o post.');
      setDeleting(false);
    }
  }

  const visibilityLabel = VISIBILITY_LABEL[post.visibility];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={styles.cardHeaderIdentity}
          onPress={() => navigation.navigate('UserProfile', { userId: post.author_id })}
        >
          {post.author_avatar_url ? (
            <Image source={{ uri: post.author_avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}
          <View>
            <Text style={styles.authorName}>{post.author_display_name}</Text>
            <Text style={styles.timestamp}>{new Date(post.created_at).toLocaleString()}</Text>
          </View>
        </TouchableOpacity>
        {isDemo ? (
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>Exemplo</Text>
          </View>
        ) : post.group_name ? (
          <View style={styles.groupBadge}>
            <Text style={styles.groupBadgeText}>{post.group_name}</Text>
          </View>
        ) : visibilityLabel ? (
          <View style={styles.groupBadge}>
            <Text style={styles.groupBadgeText}>{visibilityLabel}</Text>
          </View>
        ) : null}
        {post.author_id === currentUserId ? (
          <TouchableOpacity
            onPress={() => setConfirmingDelete(true)}
            disabled={deleting}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>{deleting ? '...' : '✕'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {confirmingDelete ? (
        <View style={styles.confirmRow}>
          <Text style={styles.confirmText}>Excluir este post?</Text>
          {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}
          <View style={styles.confirmButtons}>
            <TouchableOpacity onPress={() => setConfirmingDelete(false)} disabled={deleting}>
              <Text style={styles.confirmCancel}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirmDelete} disabled={deleting}>
              <Text style={styles.confirmDestructive}>{deleting ? 'Excluindo...' : 'Excluir'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
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
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  errorText: { color: colors.danger, textAlign: 'center', marginBottom: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  cardHeaderIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { backgroundColor: colors.placeholder },
  authorName: { fontWeight: '700', color: colors.text },
  timestamp: { color: colors.textMuted, fontSize: 12 },
  groupBadge: {
    marginLeft: 'auto',
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  groupBadgeText: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  demoBadge: {
    marginLeft: 'auto',
    backgroundColor: colors.border,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  demoBadgeText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  deleteButton: { paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  deleteButtonText: { color: colors.textMuted, fontSize: 16, fontWeight: '700' },
  confirmRow: { paddingVertical: 4 },
  confirmText: { fontSize: 14, color: colors.text },
  confirmButtons: { flexDirection: 'row', gap: 16, marginTop: 8 },
  confirmCancel: { color: colors.textMuted, fontWeight: '600' },
  confirmDestructive: { color: colors.danger, fontWeight: '600' },
  content: { fontSize: 15, marginBottom: 8, color: colors.text },
  postImage: { width: '100%', height: 220, borderRadius: 10, marginBottom: 8 },
  actionsRow: { flexDirection: 'row', gap: 20, marginTop: 4 },
  action: { color: colors.textMuted },
  actionActive: { color: colors.accent },
  commentsSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  comment: { fontSize: 14, marginBottom: 4, color: colors.text },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.text,
  },
  sendComment: { color: colors.accent, fontWeight: '600' },
});
