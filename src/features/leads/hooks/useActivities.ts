import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityApi, AddNotePayload } from '../api/activityApi';
import { ActivityEvent } from '@/types';
import { useUIStore } from '@/stores/uiStore';

export function useActivities(recordId?: string) {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const activitiesQuery = useQuery({
    queryKey: ['activities', recordId],
    queryFn: () => (recordId ? activityApi.getTimeline(recordId) : Promise.resolve([])),
    enabled: !!recordId,
    staleTime: 1000 * 60 * 2,
  });

  const addNoteMutation = useMutation({
    mutationFn: (payload: AddNotePayload) => activityApi.addNote(payload),
    onSuccess: (newActivity) => {
      queryClient.setQueryData<ActivityEvent[]>(['activities', recordId], (old = []) => [newActivity, ...old]);
      queryClient.invalidateQueries({ queryKey: ['activities', recordId] });
      addToast({
        type: 'success',
        title: 'Note Logged',
        message: 'Saved to prospect activity timeline.',
      });
    },
  });

  return {
    activities: activitiesQuery.data || [],
    isLoading: activitiesQuery.isLoading,
    addNote: addNoteMutation.mutateAsync,
    isAddingNote: addNoteMutation.isPending,
  };
}
