import { supabase } from './supabase';
import type { PostFeedItem, Profile } from '../types';

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data as Profile;
}

export async function fetchPostsByAuthor(authorId: string): Promise<PostFeedItem[]> {
  const { data, error } = await supabase.from('post_feed').select('*').eq('author_id', authorId);
  if (error) throw error;
  return data as PostFeedItem[];
}
