import { apiClient, withFallback } from '@/lib/apiClient';

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  enabled: boolean;
  triggerType?: string;
  actionType?: string;
  createdAt?: string;
}

export interface CreateAutomationPayload {
  name: string;
  trigger: string;
  condition: string;
  action: string;
  enabled?: boolean;
}

const DEFAULT_AUTOMATIONS: AutomationRule[] = [
  {
    id: 'wf_01',
    name: 'High-Intent Inbound Lead Fast Response SLA',
    trigger: 'New Lead Created with AI Score >= 80',
    condition: 'Lead source is Inbound Call or Website Form',
    action: 'Assign to Senior AE & Send WhatsApp intro within 5m',
    enabled: true,
  },
  {
    id: 'wf_02',
    name: 'SLA Breach Warning Escalation',
    trigger: 'No touch logged after 45 minutes on Hot Lead',
    condition: 'Lead status is still NEW',
    action: 'Send urgent Slack notification to Sales Manager & Reassign',
    enabled: true,
  },
  {
    id: 'wf_03',
    name: 'Post-Demo Proposal Auto-Dispatch',
    trigger: 'Call disposition marked as MEETING_BOOKED',
    condition: 'Estimated deal value > $50,000',
    action: 'Auto-generate line item proposal draft in AI Center',
    enabled: false,
  },
];

function normalizeAutomation(raw: any): AutomationRule {
  return {
    id: raw.id || raw.automationId || raw._id?.toString() || `wf_${Date.now()}`,
    name: raw.name || 'Automated Pipeline Trigger',
    trigger: raw.trigger || raw.triggerEvent || 'Deal Stage Transitioned',
    condition: raw.condition || 'Value > $25,000',
    action: raw.action || raw.actionType || 'Notify Account Executive',
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : (raw.isActive ?? true),
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
  };
}

export const automationApi = {
  getAutomations: async (): Promise<AutomationRule[]> => {
    return await withFallback(
      (async () => {
        const response = await apiClient.get<any>('/automations');
        const items = Array.isArray(response) ? response : response?.items || response?.data || [];
        return items.length ? items.map(normalizeAutomation) : DEFAULT_AUTOMATIONS;
      })(),
      DEFAULT_AUTOMATIONS,
      'Automations Subsystem'
    );
  },

  createAutomation: async (payload: CreateAutomationPayload): Promise<AutomationRule> => {
    return await withFallback(
      (async () => {
        const created = await apiClient.post<any>('/automations', payload);
        return normalizeAutomation(created);
      })(),
      normalizeAutomation({
        ...payload,
        id: `wf_${Date.now()}`,
        enabled: payload.enabled ?? true,
      }),
      'Automation Creation'
    );
  },

  toggleStatus: async (id: string, enabled: boolean): Promise<AutomationRule> => {
    return await withFallback(
      (async () => {
        const updated = await apiClient.patch<any>(`/automations/${id}/status`, { enabled });
        return normalizeAutomation(updated);
      })(),
      normalizeAutomation({
        id,
        enabled,
      }),
      'Automation Status Toggle'
    );
  },

  deleteAutomation: async (id: string): Promise<boolean> => {
    return await withFallback(
      (async () => {
        await apiClient.delete(`/automations/${id}`);
        return true;
      })(),
      true,
      'Automation Deletion'
    );
  },
};
