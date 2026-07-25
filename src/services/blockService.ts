import { supabase } from './supabase';
import type { Profile } from '../types';

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from('blocks').insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;

  // Best-effort cleanup - you can't stay friends with someone you just blocked.
  await supabase
    .from('friendships')
    .delete()
    .or(
      `and(user_id_a.eq.${blockerId},user_id_b.eq.${blockedId}),and(user_id_a.eq.${blockedId},user_id_b.eq.${blockerId})`
    );
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) throw error;
}

export async function isBlockedByMe(blockerId: string, blockedId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function fetchBlockedUsers(blockerId: string): Promise<Profile[]> {
  const { data, error } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', blockerId);
  if (error) throw error;

  const blockedIds = (data as { blocked_id: string }[]).map((row) => row.blocked_id);
  if (blockedIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', blockedIds);
  if (profilesError) throw profilesError;
  return profiles as Profile[];
}
