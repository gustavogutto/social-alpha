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

export async function findOrCreateDirectConversation(
  currentUserId: string,
  otherUserId: string
): Promise<string> {
  const { data: mine, error: mineError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, conversations!inner(is_group)')
    .eq('user_id', currentUserId)
    .eq('conversations.is_group', false);
  if (mineError) throw mineError;

  const myConversationIds = (mine as unknown as { conversation_id: string }[]).map((r) => r.conversation_id);

  if (myConversationIds.length > 0) {
    const { data: shared, error: sharedError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId)
      .in('conversation_id', myConversationIds);
    if (sharedError) throw sharedError;
    if (shared.length > 0) return shared[0].conversation_id;
  }

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({ is_group: false, created_by: currentUserId })
    .select('*')
    .single();
  if (convError) throw convError;

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
  if (participantsError) throw participantsError;

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
