import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { automationApi, AutomationRule, CreateAutomationPayload } from '../api/automationApi';
import { useUIStore } from '@/stores/uiStore';

export function useAutomations() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const automationsQuery = useQuery({
    queryKey: ['automations'],
    queryFn: () => automationApi.getAutomations(),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const createAutomationMutation = useMutation({
    mutationFn: (payload: CreateAutomationPayload) => automationApi.createAutomation(payload),
    onSuccess: (newRule) => {
      queryClient.setQueryData<AutomationRule[]>(['automations'], (old = []) => [newRule, ...old]);
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      addToast({
        type: 'success',
        title: 'Automation Activated',
        message: `${newRule.name} registered.`,
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      automationApi.toggleStatus(id, enabled),
    onSuccess: (updated) => {
      queryClient.setQueryData<AutomationRule[]>(['automations'], (old = []) =>
        old.map((a) => (a.id === updated.id ? updated : a))
      );
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      addToast({
        type: updated.enabled ? 'success' : 'info',
        title: updated.enabled ? 'Workflow Activated' : 'Workflow Paused',
        message: updated.name,
      });
    },
  });

  return {
    automations: automationsQuery.data || [],
    isLoading: automationsQuery.isLoading,
    isError: automationsQuery.isError,
    refetch: automationsQuery.refetch,
    createAutomation: createAutomationMutation.mutateAsync,
    isCreating: createAutomationMutation.isPending,
    toggleStatus: toggleStatusMutation.mutateAsync,
    isToggling: toggleStatusMutation.isPending,
  };
}
