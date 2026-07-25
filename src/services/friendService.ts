import { supabase } from './supabase';
import type { Friendship, Profile } from '../types';

const UNIQUE_VIOLATION = '23505';

function orderedPair(userId1: string, userId2: string): [string, string] {
  return [userId1, userId2].sort() as [string, string];
}

export async function sendFriendRequest(currentUserId: string, otherUserId: string): Promise<Friendship> {
  const [userIdA, userIdB] = orderedPair(currentUserId, otherUserId);

  const { data, error } = await supabase
    .from('friendships')
    .insert({ user_id_a: userIdA, user_id_b: userIdB, requester_id: currentUserId, status: 'pending' })
    .select('*')
    .single();

  if (error) {
    if (error.code !== UNIQUE_VIOLATION) throw error;
    // Already a row for this pair (pending or accepted) - return it instead of failing.
    const { data: existing, error: existingError } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id_a', userIdA)
      .eq('user_id_b', userIdB)
      .single();
    if (existingError) throw existingError;
    return existing as Friendship;
  }

  return data as Friendship;
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean): Promise<void> {
  if (accept) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', friendshipId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    if (error) throw error;
  }
}

export async function removeFriendship(friendshipId: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw error;
}

export async function fetchFriendshipStatus(
  currentUserId: string,
  otherUserId: string
): Promise<Friendship | null> {
  const [userIdA, userIdB] = orderedPair(currentUserId, otherUserId);
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('user_id_a', userIdA)
    .eq('user_id_b', userIdB)
    .maybeSingle();
  if (error) throw error;
  return data as Friendship | null;
}

async function withOtherSideProfiles(
  userId: string,
  friendships: Friendship[]
): Promise<{ friendship: Friendship; profile: Profile }[]> {
  if (friendships.length === 0) return [];

  const otherIds = friendships.map((f) => (f.user_id_a === userId ? f.user_id_b : f.user_id_a));
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').in('id', otherIds);
  if (profilesError) throw profilesError;

  const profilesById = new Map((profiles as Profile[]).map((p) => [p.id, p]));
  return friendships
    .map((friendship) => {
      const otherId = friendship.user_id_a === userId ? friendship.user_id_b : friendship.user_id_a;
      const profile = profilesById.get(otherId);
      return profile ? { friendship, profile } : null;
    })
    .filter((row): row is { friendship: Friendship; profile: Profile } => row !== null);
}

export async function fetchFriends(userId: string): Promise<{ friendship: Friendship; profile: Profile }[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('status', 'accepted')
    .or(`user_id_a.eq.${userId},user_id_b.eq.${userId}`);
  if (error) throw error;
  return withOtherSideProfiles(userId, data as Friendship[]);
}

export async function fetchPendingRequests(
  userId: string
): Promise<{ friendship: Friendship; profile: Profile }[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('status', 'pending')
    .neq('requester_id', userId)
    .or(`user_id_a.eq.${userId},user_id_b.eq.${userId}`);
  if (error) throw error;
  return withOtherSideProfiles(userId, data as Friendship[]);
}

export async function fetchSentRequests(userId: string): Promise<{ friendship: Friendship; profile: Profile }[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('status', 'pending')
    .eq('requester_id', userId);
  if (error) throw error;
  return withOtherSideProfiles(userId, data as Friendship[]);
}
