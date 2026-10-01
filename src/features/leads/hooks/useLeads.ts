import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadApi, LeadFilterParams, CreateLeadPayload, UpdateLeadPayload } from '../api/leadApi';
import { useUIStore } from '@/stores/uiStore';

export function useLeads(params?: LeadFilterParams) {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const leadsQuery = useQuery({
    queryKey: ['leads', params],
    queryFn: () => leadApi.getPaginatedLeads(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });

  const createLeadMutation = useMutation({
    mutationFn: (payload: CreateLeadPayload) => leadApi.createLead(payload),
    onSuccess: (newLead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      addToast({
        type: 'success',
        title: 'Lead Captured',
        message: `${newLead.name} (${newLead.company}) added to workspace.`,
      });
    },
    onError: (err: any) => {
      addToast({
        type: 'danger',
        title: 'Could Not Create Lead',
        message: err?.message || 'Failed to save lead to CRM backend.',
      });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLeadPayload }) =>
      leadApi.updateLead(id, payload),
    onSuccess: (updatedLead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      addToast({
        type: 'success',
        title: 'Lead Updated',
        message: `Updated status for ${updatedLead.name}.`,
      });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) => leadApi.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      addToast({
        type: 'info',
        title: 'Lead Removed',
        message: 'Lead record was archived.',
      });
    },
  });

  const data = leadsQuery.data;

  return {
    leads: data?.leads || [],
    pagination: {
      total: data?.total ?? 0,
      page: data?.page ?? 1,
      limit: data?.limit ?? 25,
      totalPages: data?.totalPages ?? 1,
      hasNextPage: !!data?.hasNextPage,
    },
    isLoading: leadsQuery.isLoading,
    isError: leadsQuery.isError,
    error: leadsQuery.error,
    refetch: leadsQuery.refetch,
    createLead: createLeadMutation.mutateAsync,
    isCreating: createLeadMutation.isPending,
    updateLead: updateLeadMutation.mutateAsync,
    isUpdating: updateLeadMutation.isPending,
    deleteLead: deleteLeadMutation.mutateAsync,
  };
}
