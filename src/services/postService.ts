import { supabase } from './supabase';
import { uploadMedia } from './mediaUpload';
import type { Comment, PostFeedItem } from '../types';

export async function fetchFeed(): Promise<PostFeedItem[]> {
  const { data, error } = await supabase.from('post_feed').select('*');
  if (error) throw error;
  return data as PostFeedItem[];
}

export async function createPost(params: {
  authorId: string;
  content: string;
  imageUris: string[];
  visibility: 'everyone' | 'group';
  groupId: string | null;
}): Promise<void> {
  const { authorId, content, imageUris, visibility, groupId } = params;

  const uploads = await Promise.all(
    imageUris.map((uri) => uploadMedia({ bucket: 'post-media', userId: authorId, uri }))
  );
  const mediaUrls = uploads.map((u) => u.url);

  const { error } = await supabase.from('posts').insert({
    author_id: authorId,
    content,
    media_urls: mediaUrls,
    visibility,
    group_id: groupId,
  });
  if (error) throw error;
}

export async function setLiked(postId: string, userId: string, liked: boolean): Promise<void> {
  if (liked) {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    if (error) throw error;
  }
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Comment[];
}

export async function addComment(postId: string, authorId: string, content: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, author_id: authorId, content })
    .select('*')
    .single();
  if (error) throw error;
  return data as Comment;
}
