import { apiClient, withFallback } from '@/lib/apiClient';
import { ActivityEvent } from '@/types';
import { SEED_ACTIVITIES } from '@/lib/mockData';

export interface AddNotePayload {
  recordType: 'lead' | 'deal' | 'account';
  recordId: string;
  note: string;
}

function normalizeActivity(raw: any): ActivityEvent {
  return {
    id: raw.id || raw.activityId || raw._id?.toString() || `act_${Date.now()}`,
    type: raw.type || 'NOTE',
    title: raw.title || 'Timeline Event',
    description: raw.description || raw.note || raw.content || '',
    actorName: raw.actorName || raw.userName || 'Sales Operations',
    actorAvatar: raw.actorAvatar,
    timestamp: raw.timestamp ? new Date(raw.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
    metadata: raw.metadata,
  };
}

export const activityApi = {
  getTimeline: async (recordId: string): Promise<ActivityEvent[]> => {
    return await withFallback(
      (async () => {
        const response = await apiClient.get<any>(`/activities/${recordId}`);
        const items = Array.isArray(response) ? response : response?.items || response?.data || [];
        return items.length ? items.map(normalizeActivity) : SEED_ACTIVITIES;
      })(),
      SEED_ACTIVITIES,
      'Activity Subsystem'
    );
  },

  addNote: async (payload: AddNotePayload): Promise<ActivityEvent> => {
    return await withFallback(
      (async () => {
        const created = await apiClient.post<any>('/activities/note', payload);
        return normalizeActivity(created);
      })(),
      normalizeActivity({
        id: `act_${Date.now()}`,
        type: 'NOTE',
        title: 'Note Logged',
        description: payload.note,
        actorName: 'You',
        timestamp: new Date().toISOString(),
      }),
      'Activity Note'
    );
  },
};
