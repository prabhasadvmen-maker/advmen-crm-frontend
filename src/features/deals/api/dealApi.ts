import { apiClient, withFallback } from '@/lib/apiClient';
import { Deal, DealStage } from '@/types';
import { SEED_DEALS } from '@/lib/mockData';

export interface CreateDealPayload {
  title: string;
  value: number;
  currency?: string;
  stage?: DealStage;
  probability?: number;
  expectedCloseDate?: string;
  leadId?: string;
  contactName?: string;
  company?: string;
  ownerId?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface UpdateDealPayload extends Partial<CreateDealPayload> {}

function normalizeDeal(raw: any): Deal {
  return {
    id: raw.id || raw._id?.toString() || `deal_${Date.now()}`,
    organizationId: raw.organizationId || 'org_acme_corp',
    title: raw.title || 'Enterprise Expansion',
    leadId: raw.leadId || '',
    company: raw.company || 'Global Tech',
    contactName: raw.contactName || 'Lead Executive',
    contactEmail: raw.contactEmail || '',
    contactPhone: raw.contactPhone || '',
    contactAddress: raw.contactAddress || '',
    value: raw.value ?? 0,
    stage: (raw.stage as DealStage) || 'DISCOVERY',
    probability: raw.probability ?? (raw.stage === 'WON' ? 100 : 50),
    expectedCloseDate: raw.expectedCloseDate ? new Date(raw.expectedCloseDate).toISOString().split('T')[0] : '2026-09-30',
    assignedTo: raw.assignedTo || { id: 'usr_rep_01', name: 'Devon Patel' },
    health: raw.health || 'HEALTHY',
    notes: raw.notes || raw.message || raw.transitions?.[0]?.reason || '',
    message: raw.notes || raw.message || raw.transitions?.[0]?.reason || '',
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : 'Just now',
  };
}

export const dealApi = {
  getDeals: async (): Promise<Deal[]> => {
    return await withFallback(
      (async () => {
        const response = await apiClient.get<any>('/deals');
        const items = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.docs)
          ? response.docs
          : [];
        return items.map(normalizeDeal);
      })(),
      SEED_DEALS,
      'Deals Pipeline Subsystem'
    );
  },

  getDealById: async (id: string): Promise<Deal | null> => {
    return await withFallback(
      (async () => {
        const raw = await apiClient.get<any>(`/deals/${id}`);
        return raw ? normalizeDeal(raw) : null;
      })(),
      SEED_DEALS.find((d) => d.id === id) || null,
      'Deal Detail'
    );
  },

  createDeal: async (payload: CreateDealPayload): Promise<Deal> => {
    const created = await apiClient.post<any>('/deals', payload);
    return normalizeDeal(created);
  },

  updateDeal: async (id: string, payload: UpdateDealPayload): Promise<Deal> => {
    const updated = await apiClient.patch<any>(`/deals/${id}`, payload);
    return normalizeDeal(updated);
  },

  deleteDeal: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/deals/${id}`);
    return true;
  },
};
