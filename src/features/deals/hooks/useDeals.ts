import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealApi, CreateDealPayload } from '../api/dealApi';
import { Deal, DealStage } from '@/types';
import { useUIStore } from '@/stores/uiStore';

export function useDeals() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const dealsQuery = useQuery({
    queryKey: ['deals'],
    queryFn: () => dealApi.getDeals(),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const createDealMutation = useMutation({
    mutationFn: (payload: CreateDealPayload) => dealApi.createDeal(payload),
    onSuccess: (newDeal) => {
      queryClient.setQueryData<Deal[]>(['deals'], (old = []) => [newDeal, ...old]);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      addToast({
        type: 'success',
        title: 'Deal Created',
        message: `${newDeal.title} added to pipeline.`,
      });
    },
    onError: (err: any) => {
      addToast({
        type: 'danger',
        title: 'Deal Creation Failed',
        message: err?.message || 'Could not save deal to database.',
      });
    },
  });

  const moveStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: DealStage }) =>
      dealApi.updateDeal(id, { stage }),
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ['deals'] });
      const previousDeals = queryClient.getQueryData<Deal[]>(['deals']);
      queryClient.setQueryData<Deal[]>(['deals'], (old = []) =>
        old.map((d) => (d.id === id ? { ...d, stage, updatedAt: 'Just now' } : d))
      );
      return { previousDeals };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(['deals'], context.previousDeals);
      }
      addToast({
        type: 'danger',
        title: 'Could Not Update Deal Stage',
        message: 'Reverting pipeline position.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: (id: string) => dealApi.deleteDeal(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Deal[]>(['deals'], (old = []) =>
        old.filter((d) => d.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      addToast({
        type: 'success',
        title: 'Deal Removed',
        message: 'Opportunity deleted from pipeline.',
      });
    },
    onError: (err: any) => {
      addToast({
        type: 'danger',
        title: 'Delete Failed',
        message: err?.message || 'Could not delete deal.',
      });
    },
  });

  return {
    deals: dealsQuery.data || [],
    isLoading: dealsQuery.isLoading,
    isError: dealsQuery.isError,
    error: dealsQuery.error,
    createDeal: createDealMutation.mutateAsync,
    isCreating: createDealMutation.isPending,
    moveStage: (id: string, stage: DealStage) => moveStageMutation.mutateAsync({ id, stage }),
    deleteDeal: deleteDealMutation.mutateAsync,
    isDeleting: deleteDealMutation.isPending,
  };
}
