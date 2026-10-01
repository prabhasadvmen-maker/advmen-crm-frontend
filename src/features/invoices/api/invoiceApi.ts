import { apiClient, withFallback } from '@/lib/apiClient';
import { Invoice } from '@/types';
import { SEED_INVOICES } from '@/lib/mockData';

export interface InvoiceFilterParams {
  page?: number;
  limit?: number;
  status?: string;
}

export interface CreateInvoicePayload {
  dealId?: string;
  leadId?: string;
  recipientName?: string;
  recipientEmail?: string;
  company?: string;
  amount: number;
  currency?: string;
  dueDate: string;
  lineItems?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
}

export interface RecordPaymentPayload {
  paymentId?: string;
  paymentProvider?: string;
  idempotencyKey?: string;
}

function normalizeInvoice(raw: any): Invoice {
  return {
    id: raw.id || raw.invoiceId || raw._id?.toString() || `inv_${Date.now()}`,
    invoiceNumber: raw.invoiceNumber || raw.id || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    dealId: raw.dealId,
    leadId: raw.leadId,
    company: raw.company || raw.recipientName || 'Enterprise Client',
    amount: typeof raw.amount === 'number' ? raw.amount : 25000,
    currency: raw.currency || 'USD',
    status: raw.status || 'SENT',
    dueDate: raw.dueDate ? new Date(raw.dueDate).toLocaleDateString() : 'Net 30',
    paidAt: raw.paidAt ? new Date(raw.paidAt).toLocaleDateString() : undefined,
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
  };
}

export const invoiceApi = {
  getInvoices: async (params?: InvoiceFilterParams): Promise<Invoice[]> => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';

    return await withFallback(
      (async () => {
        const response = await apiClient.get<any>(`/invoices${queryString}`);
        const items = Array.isArray(response) ? response : response?.items || response?.data || [];
        return items.map(normalizeInvoice);
      })(),
      SEED_INVOICES,
      'Invoices Subsystem'
    );
  },

  getMetrics: async (): Promise<{ totalRevenue: number; paidCount: number; pendingCount: number; overdueCount: number }> => {
    return await withFallback(
      (async () => {
        return await apiClient.get<any>('/invoices/metrics');
      })(),
      {
        totalRevenue: 285000,
        paidCount: 14,
        pendingCount: 6,
        overdueCount: 1,
      },
      'Invoice Metrics'
    );
  },

  createInvoice: async (payload: CreateInvoicePayload): Promise<Invoice> => {
    const created = await apiClient.post<any>('/invoices', payload);
    return normalizeInvoice(created);
  },

  recordPayment: async (id: string, payload?: RecordPaymentPayload): Promise<Invoice> => {
    const paymentData = {
      paymentId: payload?.paymentId || `pay_${Date.now()}`,
      paymentProvider: payload?.paymentProvider || 'stripe',
      idempotencyKey: payload?.idempotencyKey || `idem_${Date.now()}_${id}`,
    };

    const updated = await apiClient.post<any>(`/invoices/${id}/pay`, paymentData);
    return normalizeInvoice(updated);
  },

  deleteInvoice: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/invoices/${id}`);
    return true;
  },
};
