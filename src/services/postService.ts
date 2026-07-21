import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import type { Comment, PostFeedItem } from '../types';

export async function fetchFeed(): Promise<PostFeedItem[]> {
  const { data, error } = await supabase.from('post_feed').select('*');
  if (error) throw error;
  return data as PostFeedItem[];
}

async function uploadPostImage(userId: string, uri: string): Promise<string> {
  const extMatch = uri.match(/\.(\w+)(?:\?.*)?$/);
  const ext = extMatch ? extMatch[1] : 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

  let arrayBuffer: ArrayBuffer;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    arrayBuffer = await blob.arrayBuffer();
  } else {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    arrayBuffer = decode(base64);
  }

  const { error } = await supabase.storage.from('post-media').upload(path, arrayBuffer, {
    contentType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('post-media').getPublicUrl(path);
  return data.publicUrl;
}

export async function createPost(params: {
  authorId: string;
  content: string;
  imageUris: string[];
  visibility: 'everyone' | 'group';
  groupId: string | null;
}): Promise<void> {
  const { authorId, content, imageUris, visibility, groupId } = params;

  const mediaUrls = await Promise.all(imageUris.map((uri) => uploadPostImage(authorId, uri)));

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
