import { supabase } from './supabase';
import type { NotificationFeedItem } from '../types';

export async function fetchNotifications(): Promise<NotificationFeedItem[]> {
  const { data, error } = await supabase.from('notification_feed').select('*');
  if (error) throw error;
  return data as NotificationFeedItem[];
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
  if (error) throw error;
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

export function subscribeToNotifications(userId: string, onInsert: () => void) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => onInsert()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
