import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proposalApi, ProposalFilterParams, CreateProposalPayload } from '../api/proposalApi';
import { Proposal } from '@/types';
import { useUIStore } from '@/stores/uiStore';

export function useProposals(params?: ProposalFilterParams) {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const proposalsQuery = useQuery({
    queryKey: ['proposals', params],
    queryFn: () => proposalApi.getProposals(params),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const createProposalMutation = useMutation({
    mutationFn: (payload: CreateProposalPayload) => proposalApi.createProposal(payload),
    onSuccess: (newProposal) => {
      queryClient.setQueryData<Proposal[]>(['proposals', params], (old = []) => [newProposal, ...old]);
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      addToast({
        type: 'success',
        title: 'Proposal Dispatched',
        message: `${newProposal.proposalNumber} sent to ${newProposal.recipientEmail}.`,
      });
    },
    onError: (err: any) => {
      addToast({
        type: 'danger',
        title: 'Proposal Failed',
        message: err?.message || 'Could not dispatch proposal.',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Proposal['status'] }) =>
      proposalApi.updateStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData<Proposal[]>(['proposals', params], (old = []) =>
        old.map((p) => (p.id === updated.id ? updated : p))
      );
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      addToast({
        type: 'success',
        title: 'Proposal Updated',
        message: `${updated.proposalNumber} marked as ${updated.status}.`,
      });
    },
  });

  const deleteProposalMutation = useMutation({
    mutationFn: (id: string) => proposalApi.deleteProposal(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Proposal[]>(['proposals', params], (old = []) =>
        old.filter((p) => p.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      addToast({
        type: 'success',
        title: 'Proposal Deleted',
        message: 'Contract proposal removed.',
      });
    },
    onError: (err: any) => {
      addToast({
        type: 'danger',
        title: 'Delete Failed',
        message: err?.message || 'Could not delete proposal.',
      });
    },
  });

  return {
    proposals: proposalsQuery.data || [],
    isLoading: proposalsQuery.isLoading,
    isError: proposalsQuery.isError,
    refetch: proposalsQuery.refetch,
    createProposal: createProposalMutation.mutateAsync,
    isCreating: createProposalMutation.isPending,
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
    deleteProposal: deleteProposalMutation.mutateAsync,
    isDeleting: deleteProposalMutation.isPending,
  };
}
