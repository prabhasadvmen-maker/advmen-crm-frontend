import { apiClient, withFallback } from '@/lib/apiClient';
import { Proposal } from '@/types';
import { SEED_PROPOSALS } from '@/lib/mockData';

export interface ProposalFilterParams {
  dealId?: string;
  status?: string;
}

export interface CreateProposalPayload {
  dealId?: string;
  dealTitle?: string;
  recipientName: string;
  recipientEmail: string;
  company?: string;
  amount: number;
  validUntil?: string;
  lineItems?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
}

function normalizeProposal(raw: any): Proposal {
  return {
    id: raw.id || raw.proposalId || raw._id?.toString() || `prop_${Date.now()}`,
    proposalNumber: raw.proposalNumber || raw.id || `PROP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    dealId: raw.dealId || 'deal_01',
    dealTitle: raw.dealTitle || 'Enterprise Growth Contract',
    company: raw.company || 'TechCorp Global',
    recipientName: raw.recipientName || 'Operations VP',
    recipientEmail: raw.recipientEmail || 'prospect@techcorp.com',
    amount: typeof raw.amount === 'number' ? raw.amount : (raw.totalAmount ?? 45000),
    status: raw.status || 'DRAFT',
    validUntil: raw.validUntil ? new Date(raw.validUntil).toLocaleDateString() : '2026-09-30',
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
  };
}

export const proposalApi = {
  getProposals: async (params?: ProposalFilterParams): Promise<Proposal[]> => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.dealId) query.set('dealId', params.dealId);

    const queryString = query.toString() ? `?${query.toString()}` : '';

    return await withFallback(
      (async () => {
        const response = await apiClient.get<any>(`/proposals${queryString}`);
        const items = Array.isArray(response) ? response : response?.items || response?.data || [];
        return items.map(normalizeProposal);
      })(),
      SEED_PROPOSALS,
      'Proposals Subsystem'
    );
  },

  createProposal: async (payload: CreateProposalPayload): Promise<Proposal> => {
    const created = await apiClient.post<any>('/proposals', payload);
    return normalizeProposal(created);
  },

  updateStatus: async (id: string, status: Proposal['status']): Promise<Proposal> => {
    const updated = await apiClient.patch<any>(`/proposals/${id}/status`, { status });
    return normalizeProposal(updated);
  },

  deleteProposal: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/proposals/${id}`);
    return true;
  },
};
