import { supabase } from './supabase';
import type { RecadoFeedItem } from '../types';

export async function fetchRecados(profileId: string): Promise<RecadoFeedItem[]> {
  const { data, error } = await supabase.from('recado_feed').select('*').eq('profile_id', profileId);
  if (error) throw error;
  return data as RecadoFeedItem[];
}

export async function postRecado(profileId: string, authorId: string, content: string): Promise<void> {
  const { error } = await supabase.from('recados').insert({ profile_id: profileId, author_id: authorId, content });
  if (error) throw error;
}

export async function deleteRecado(recadoId: string): Promise<void> {
  const { error } = await supabase.from('recados').delete().eq('id', recadoId);
  if (error) throw error;
}
