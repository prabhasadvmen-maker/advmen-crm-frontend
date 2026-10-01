import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callApi, CallFilterParams, LogCallPayload } from '../api/callApi';
import { CallRecord } from '@/types';
import { useUIStore } from '@/stores/uiStore';

export function useCalls(params?: CallFilterParams) {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const callsQuery = useQuery({
    queryKey: ['calls', params],
    queryFn: () => callApi.getCalls(params),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const metricsQuery = useQuery({
    queryKey: ['calls', 'metrics'],
    queryFn: () => callApi.getMetrics(),
    staleTime: 1000 * 60 * 5,
  });

  const logCallMutation = useMutation({
    mutationFn: (payload: LogCallPayload) => callApi.logCall(payload),
    onSuccess: (newCall) => {
      queryClient.setQueryData<CallRecord[]>(['calls', params], (old = []) => [newCall, ...old]);
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      addToast({
        type: 'success',
        title: 'Call Record Saved',
        message: `Call with ${newCall.leadName} (${newCall.durationSeconds}s) logged to CRM.`,
      });
    },
    onError: (err: any) => {
      addToast({
        type: 'danger',
        title: 'Call Save Failed',
        message: err?.message || 'Could not log call record.',
      });
    },
  });

  return {
    calls: callsQuery.data || [],
    metrics: metricsQuery.data,
    isLoading: callsQuery.isLoading,
    isError: callsQuery.isError,
    refetch: callsQuery.refetch,
    logCall: logCallMutation.mutateAsync,
    isLoggingCall: logCallMutation.isPending,
  };
}
