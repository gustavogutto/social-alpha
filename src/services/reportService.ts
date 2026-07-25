import { supabase } from './supabase';

export type ReportTargetType = 'post' | 'profile' | 'comment';

export async function submitReport(params: {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}): Promise<void> {
  const { reporterId, targetType, targetId, reason } = params;
  const { error } = await supabase
    .from('reports')
    .insert({ reporter_id: reporterId, target_type: targetType, target_id: targetId, reason });
  if (error) throw error;
}
