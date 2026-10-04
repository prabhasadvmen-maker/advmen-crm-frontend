import { apiClient, withFallback } from '@/lib/apiClient';
import { Lead } from '@/types';

export interface LeadFilterParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  source?: string;
  ownerId?: string;
}

export interface PaginatedLeadsResult {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface FinalizedLead {
  id: string;
  leadId?: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  leadAddress?: string;
  customFields?: Record<string, unknown>;
  status: string;
  assignedTo?: { id?: string; name: string };
  ownerId?: string;
  budget?: number;
  estimatedValue?: number;
  notes?: string;
  message?: string;
  createdAt?: string;
  updatedAt?: string;
  clearedInfo: {
    clearedAt: string;
    purpose: string;
    notes?: string;
    message?: string;
    dealValue?: number;
    clearedBy?: { id: string; name: string };
    clearedByName?: string;
    paymentInvoiceId?: string;
    paymentRecordedAt?: string;
    paymentTotalPaid?: number;
  };
}

export interface CreateLeadPayload {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  title?: string;
  status?: string;
  budget?: number;
  requirement?: string;
  source?: string;
  tags?: string[];
  ownerId?: string;
  assignedTo?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface UpdateLeadPayload extends Partial<CreateLeadPayload> {
  score?: number;
  aiSummary?: unknown;
}

// Normalizer to guarantee consistent Lead structure across backend MongoDB & client models
function normalizeLead(raw: any): Lead {
  const hasAssigned = raw.assignedTo && raw.assignedTo.name && (raw.ownerId || raw.assignedTo.id);
  const score = Number(raw.score ?? 70);

  return {
    id: raw._id?.toString() || raw.id || raw.leadId || `lead_${Date.now()}`,
    organizationId: raw.organizationId || '',
    name: raw.name || 'Unnamed Prospect',
    title: raw.title || '',
    company: raw.company || '',
    email: raw.email || '',
    phone: raw.phone || '',
    status: raw.status || 'NEW',
    source: raw.source || 'MANUAL',
    score,
    scoreCategory: raw.scoreCategory || (score >= 80 ? 'HOT' : score >= 50 ? 'WARM' : 'COLD'),
    estimatedValue: raw.estimatedValue ?? raw.budget ?? 0,
    assignedTo: hasAssigned
      ? {
          id: raw.assignedTo.id || raw.ownerId,
          name: raw.assignedTo.name,
          avatarUrl: raw.assignedTo.avatarUrl,
        }
      : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    queries: Array.isArray(raw.queries) ? raw.queries : [],
    clearedInfo: raw.clearedInfo,
    aiSummary: raw.aiSummary,
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
  };
}

export const leadApi = {
  getPaginatedLeads: async (params?: LeadFilterParams): Promise<PaginatedLeadsResult> => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.ownerId && params.ownerId !== 'ALL') query.set('ownerId', params.ownerId);

    const queryString = query.toString() ? `?${query.toString()}` : '';

    return await withFallback(
      (async () => {
        const response = await apiClient.getWithMeta<any[]>(`/leads${queryString}`);
        const items = Array.isArray(response.data) ? response.data : [];
        const leads = items.map(normalizeLead);
        return {
          leads,
          total: response.meta?.total ?? leads.length,
          page: response.meta?.page ?? (params?.page || 1),
          limit: response.meta?.limit ?? (params?.limit ?? 25),
          totalPages: response.meta?.totalPages ?? (Math.ceil((response.meta?.total ?? leads.length) / (params?.limit ?? 25)) || 1),
          hasNextPage: !!response.meta?.hasNextPage,
        };
      })(),
      {
        leads: [],
        total: 0,
        page: 1,
        limit: 25,
        totalPages: 0,
        hasNextPage: false,
      },
      'Paginated Leads'
    );
  },

  getLeads: async (params?: LeadFilterParams): Promise<Lead[]> => {
    const res = await leadApi.getPaginatedLeads(params);
    return res.leads;
  },

  getUnassignedSummary: async (): Promise<{ total: number; unassignedIds: string[] }> => {
    return await apiClient.get<{ total: number; unassignedIds: string[] }>('/leads/unassigned-summary');
  },

  distributeQuantity: async (employeeId: string, quantity: number) => {
    return await apiClient.post<{ assignedCount: number; employee: { id: string; name: string } }>(
      '/leads/distribute-quantity',
      { employeeId, quantity }
    );
  },

  distributeEvenly: async (leadIds: string[], employeeIds: string[]) => {
    return await apiClient.post<{ assignedCount: number; distribution: any[] }>(
      '/leads/distribute-evenly',
      { leadIds, employeeIds }
    );
  },

  assignBulk: async (leadIds: string[], employeeId: string) => {
    return await apiClient.post<{ assignedCount: number }>('/leads/assign-bulk', {
      leadIds,
      employeeId,
    });
  },

  distributeCustom: async (distribution: Array<{ employeeId: string; leadIds: string[] }>) => {
    return await apiClient.post<{ assignedCount: number; distribution: any[] }>(
      '/leads/distribute-custom',
      { distribution }
    );
  },

  getBulkDeleteCount: async (params: {
    leadIds?: string[];
    status?: string;
    statuses?: string[];
    employeeId?: string;
    unassignedOnly?: boolean;
    all?: boolean;
  }) => {
    return await apiClient.post<{ count: number; protectedCount: number }>('/leads/bulk-delete/count', params);
  },

  bulkDelete: async (params: {
    leadIds?: string[];
    status?: string;
    statuses?: string[];
    employeeId?: string;
    unassignedOnly?: boolean;
    all?: boolean;
  }) => {
    return await apiClient.post<{ deletedCount: number; protectedCount: number }>('/leads/bulk-delete', params);
  },

  getLeadById: async (id: string): Promise<Lead | null> => {
    return await withFallback(
      (async () => {
        const raw = await apiClient.get<any>(`/leads/${id}`);
        return raw ? normalizeLead(raw) : null;
      })(),
      null,
      'Lead Detail'
    );
  },

  createLead: async (payload: CreateLeadPayload): Promise<Lead> => {
    const created = await apiClient.post<any>('/leads', payload);
    return normalizeLead(created);
  },

  updateLead: async (id: string, payload: UpdateLeadPayload): Promise<Lead> => {
    const updated = await apiClient.patch<any>(`/leads/${id}`, payload);
    return normalizeLead(updated);
  },

  deleteLead: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/leads/${id}`);
    return true;
  },

  generateAiSummary: async (leadId: string): Promise<any> => {
    return await apiClient.post<any>('/ai/lead-summary', { leadId });
  },

  raiseQuery: async (
    leadId: string,
    payload: { text: string; priority?: 'NORMAL' | 'HIGH' | 'URGENT' }
  ): Promise<Lead> => {
    const raw = await apiClient.post<any>(`/leads/${leadId}/query`, payload);
    return normalizeLead(raw);
  },

  resolveQuery: async (
    leadId: string,
    queryId: string,
    reply?: string
  ): Promise<Lead> => {
    const raw = await apiClient.post<any>(`/leads/${leadId}/query/${queryId}/resolve`, { reply });
    return normalizeLead(raw);
  },

  getAllQueries: async (): Promise<any[]> => {
    return await apiClient.get<any[]>('/leads/queries/all');
  },

  completeLead: async (
    leadId: string,
    payload: { purpose: string; dealValue?: number; status?: 'WON' | 'CONVERTED'; notes?: string }
  ): Promise<Lead> => {
    const raw = await apiClient.post<any>(`/leads/${leadId}/complete`, payload);
    return normalizeLead(raw);
  },

  getFinalizedLeads: async (): Promise<FinalizedLead[]> => {
    return await apiClient.get<FinalizedLead[]>('/leads/finalized/all');
  },

  getMyFinalizedLeads: async (): Promise<FinalizedLead[]> => {
    return await apiClient.get<FinalizedLead[]>('/leads/finalized/mine');
  },

  getEmployeeLeadStats: async (): Promise<any[]> => {
    return await apiClient.get<any[]>('/leads/stats/employees');
  },
};
