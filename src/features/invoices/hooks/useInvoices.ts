import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceApi, InvoiceFilterParams, CreateInvoicePayload, RecordPaymentPayload } from '../api/invoiceApi';
import { Invoice } from '@/types';
import { useUIStore } from '@/stores/uiStore';

export function useInvoices(params?: InvoiceFilterParams) {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const invoicesQuery = useQuery({
    queryKey: ['invoices', params],
    queryFn: () => invoiceApi.getInvoices(params),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const metricsQuery = useQuery({
    queryKey: ['invoices', 'metrics'],
    queryFn: () => invoiceApi.getMetrics(),
    staleTime: 1000 * 60 * 5,
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (payload: CreateInvoicePayload) => invoiceApi.createInvoice(payload),
    onSuccess: (newInvoice) => {
      queryClient.setQueryData<Invoice[]>(['invoices', params], (old = []) => [newInvoice, ...old]);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      addToast({
        type: 'success',
        title: 'Invoice Dispatched',
        message: `${newInvoice.invoiceNumber} created for ${newInvoice.company}.`,
      });
    },
    onError: (err: any) => {
      addToast({
        type: 'danger',
        title: 'Invoice Failed',
        message: err?.message || 'Could not issue invoice.',
      });
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: RecordPaymentPayload }) =>
      invoiceApi.recordPayment(id, payload),
    onSuccess: (paidInvoice) => {
      queryClient.setQueryData<Invoice[]>(['invoices', params], (old = []) =>
        old.map((i) => (i.id === paidInvoice.id ? paidInvoice : i))
      );
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      addToast({
        type: 'success',
        title: 'Payment Registered',
        message: `${paidInvoice.invoiceNumber} ($${paidInvoice.amount.toLocaleString()}) marked as paid.`,
      });
    },
    onError: (err: any) => {
      addToast({
        type: 'danger',
        title: 'Payment Record Failed',
        message: err?.message || 'Could not record invoice payment.',
      });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: string) => invoiceApi.deleteInvoice(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Invoice[]>(['invoices', params], (old = []) =>
        old.filter((i) => i.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      addToast({
        type: 'success',
        title: 'Invoice Deleted',
        message: 'Invoice has been removed.',
      });
    },
    onError: (err: any) => {
      addToast({
        type: 'danger',
        title: 'Delete Failed',
        message: err?.message || 'Could not delete invoice.',
      });
    },
  });

  return {
    invoices: invoicesQuery.data || [],
    metrics: metricsQuery.data,
    isLoading: invoicesQuery.isLoading,
    isError: invoicesQuery.isError,
    refetch: invoicesQuery.refetch,
    createInvoice: createInvoiceMutation.mutateAsync,
    isCreating: createInvoiceMutation.isPending,
    recordPayment: recordPaymentMutation.mutateAsync,
    isRecordingPayment: recordPaymentMutation.isPending,
    deleteInvoice: deleteInvoiceMutation.mutateAsync,
    isDeleting: deleteInvoiceMutation.isPending,
  };
}
