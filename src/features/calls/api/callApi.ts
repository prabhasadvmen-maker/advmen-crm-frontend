import { apiClient, withFallback } from '@/lib/apiClient';
import { CallRecord, CallDisposition, CallStatus } from '@/types';
import { SEED_CALLS } from '@/lib/mockData';

export interface CallFilterParams {
  userId?: string;
  leadId?: string;
  disposition?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface LogCallPayload {
  leadId: string;
  leadName?: string;
  leadPhone: string;
  leadCompany?: string;
  status?: CallStatus;
  disposition?: CallDisposition;
  durationSeconds?: number;
  notes?: string;
  recordingUrl?: string;
  transcriptSnippet?: string;
  aiSentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

export interface CallMetrics {
  totalCalls: number;
  totalDurationSeconds: number;
  avgDurationSeconds: number;
  meetingsBooked: number;
  conversionRate: number;
}

function normalizeCall(raw: any): CallRecord {
  return {
    id: raw.id || raw.callId || raw._id?.toString() || `call_${Date.now()}`,
    organizationId: raw.organizationId || 'org_acme_corp',
    leadId: raw.leadId || 'lead_01',
    leadName: raw.leadName || 'Executive Prospect',
    leadPhone: raw.leadPhone || '+1 (555) 234-5678',
    leadCompany: raw.leadCompany || 'Acme Global',
    callerId: raw.callerId || raw.userId || 'usr_tele_01',
    callerName: raw.callerName || 'Elena Rostova',
    status: raw.status || 'COMPLETED',
    disposition: raw.disposition || 'INTERESTED',
    durationSeconds: raw.durationSeconds ?? (raw.duration || 120),
    recordingUrl: raw.recordingUrl,
    transcriptSnippet: raw.transcriptSnippet || raw.notes || 'Prospect interested in scheduling discovery call.',
    aiSentiment: raw.aiSentiment || 'POSITIVE',
    notes: raw.notes || '',
    completedAt: raw.completedAt || raw.endedAt ? new Date(raw.completedAt || raw.endedAt).toISOString() : new Date().toISOString(),
  };
}

export const callApi = {
  getCalls: async (params?: CallFilterParams): Promise<CallRecord[]> => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.disposition && params.disposition !== 'ALL') query.set('disposition', params.disposition);
    if (params?.userId) query.set('userId', params.userId);
    if (params?.leadId) query.set('leadId', params.leadId);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : '';

    return await withFallback(
      (async () => {
        const response = await apiClient.get<any>(`/calls${queryString}`);
        const items = Array.isArray(response) ? response : response?.items || response?.data || [];
        return items.map(normalizeCall);
      })(),
      SEED_CALLS,
      'Calls Subsystem'
    );
  },

  getMetrics: async (): Promise<CallMetrics> => {
    return await withFallback(
      (async () => {
        return await apiClient.get<CallMetrics>('/calls/metrics');
      })(),
      {
        totalCalls: 48,
        totalDurationSeconds: 6840,
        avgDurationSeconds: 142,
        meetingsBooked: 12,
        conversionRate: 25,
      },
      'Call Metrics'
    );
  },

  logCall: async (payload: LogCallPayload): Promise<CallRecord> => {
    return await withFallback(
      (async () => {
        const created = await apiClient.post<any>('/calls', payload);
        return normalizeCall(created);
      })(),
      normalizeCall({
        ...payload,
        id: `call_${Date.now()}`,
        status: 'COMPLETED',
        durationSeconds: payload.durationSeconds || 60,
      }),
      'Call Logging'
    );
  },
};
