import { supabase } from './supabase';
import type { Message, ConversationSummary, ConversationWithParticipants, Profile } from '../types';

export async function fetchConversations(userId: string): Promise<ConversationWithParticipants[]> {
  const { data: summaries, error } = await supabase
    .from('conversation_summaries')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) throw error;

  const conversations = summaries as ConversationSummary[];
  if (conversations.length === 0) return [];

  const { data: participantRows, error: participantsError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, profiles(*)')
    .in(
      'conversation_id',
      conversations.map((c) => c.id)
    )
    .neq('user_id', userId);
  if (participantsError) throw participantsError;

  const participantsByConversation = new Map<string, Profile[]>();
  for (const row of participantRows as unknown as { conversation_id: string; profiles: Profile }[]) {
    const list = participantsByConversation.get(row.conversation_id) ?? [];
    list.push(row.profiles);
    participantsByConversation.set(row.conversation_id, list);
  }

  return conversations.map((c) => ({
    ...c,
    otherParticipants: participantsByConversation.get(c.id) ?? [],
  }));
}

const UNIQUE_VIOLATION = '23505';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function findOrCreateDirectConversation(
  currentUserId: string,
  otherUserId: string
): Promise<string> {
  // Deterministic per unordered pair - backed by a DB unique index (see migration 010),
  // so two concurrent calls for the same pair can never create two conversations.
  const dmKey = [currentUserId, otherUserId].sort().join(':');

  const { data: existing, error: existingError } = await supabase
    .from('conversations')
    .select('id')
    .eq('dm_key', dmKey)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing.id as string;

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({ is_group: false, created_by: currentUserId, dm_key: dmKey })
    .select('*')
    .single();

  if (convError) {
    if (convError.code !== UNIQUE_VIOLATION) throw convError;

    // Lost the race - another request just created this pair's conversation.
    // Its participant rows may not have committed yet, so retry the lookup briefly.
    for (let attempt = 0; attempt < 5; attempt++) {
      await sleep(150);
      const { data: winner, error: winnerError } = await supabase
        .from('conversations')
        .select('id')
        .eq('dm_key', dmKey)
        .maybeSingle();
      if (winnerError) throw winnerError;
      if (winner) return winner.id as string;
    }
    throw convError;
  }

  const { error: participantsError } = await supabase.from('conversation_participants').insert([
    { conversation_id: conversation.id, user_id: currentUserId },
    { conversation_id: conversation.id, user_id: otherUserId },
  ]);
  if (participantsError) throw participantsError;

  return conversation.id as string;
}

export async function createGroupConversation(params: {
  name: string;
  creatorId: string;
  memberIds: string[];
}): Promise<string> {
  const { name, creatorId, memberIds } = params;

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({ is_group: true, name, created_by: creatorId })
    .select('*')
    .single();
  if (convError) throw convError;

  const uniqueMemberIds = Array.from(new Set([creatorId, ...memberIds]));
  const { error: participantsError } = await supabase.from('conversation_participants').insert(
    uniqueMemberIds.map((userId) => ({ conversation_id: conversation.id, user_id: userId }))
  );
  if (participantsError) {
    await supabase.from('conversations').delete().eq('id', conversation.id);
    throw participantsError;
  }

  return conversation.id as string;
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Message[];
}

export async function sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select('*')
    .single();
  if (error) throw error;
  return data as Message;
}

export function subscribeToMessages(conversationId: string, onInsert: (message: Message) => void) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onInsert(payload.new as Message)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
