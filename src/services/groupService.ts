import { supabase } from './supabase';
import type { Group, Profile } from '../types';

export async function fetchMyGroups(): Promise<Group[]> {
  const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Group[];
}

export async function fetchOtherProfiles(currentUserId: string): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').neq('id', currentUserId);
  if (error) throw error;
  return data as Profile[];
}

export async function createGroup(params: {
  name: string;
  creatorId: string;
  memberIds: string[];
}): Promise<Group> {
  const { name, creatorId, memberIds } = params;

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({ name, created_by: creatorId })
    .select('*')
    .single();
  if (groupError) throw groupError;

  const uniqueMemberIds = Array.from(new Set([creatorId, ...memberIds]));
  const { error: membersError } = await supabase.from('group_members').insert(
    uniqueMemberIds.map((userId) => ({ group_id: group.id, user_id: userId }))
  );
  if (membersError) throw membersError;

  return group as Group;
}

export async function fetchGroupMemberIds(groupId: string): Promise<string[]> {
  const { data, error } = await supabase.from('group_members').select('user_id').eq('group_id', groupId);
  if (error) throw error;
  return data.map((row) => row.user_id as string);
}
