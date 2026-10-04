import { apiClient, withFallback } from '@/lib/apiClient';

export interface LeadSummaryResponse {
  aiSummary: {
    overview: string;
    intentLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    suggestedAction: string;
    keyPoints: string[];
    isApproved?: boolean;
  };
  meta: {
    latencyMs: number;
    tokens: number;
    model: string;
  };
}

export interface EmailDraftPayload {
  recipientName: string;
  context: string;
  goal: string;
}

export interface EmailDraftResponse {
  draft: string;
  meta: {
    latencyMs: number;
    tokens: number;
    model: string;
  };
}

export interface PipelineAuditResponse {
  recommendations: Array<{
    id: string;
    title: string;
    intentLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    content: string;
    keyPoints: string[];
    suggestedAction: string;
  }>;
  meta: {
    totalLeads: number;
    totalDeals: number;
    totalInvoices: number;
    latencyMs: number;
    tokens: number;
    model: string;
  };
}

export interface WhatsAppDraft {
  _id: string;
  leadId: string;
  leadName: string;
  recipientPhone: string;
  queryText?: string;
  outstandingAmount: number;
  currency: string;
  message: string;
  status: 'PENDING_APPROVAL' | 'SENDING' | 'SENT' | 'REJECTED' | 'FAILED' | 'SEND_UNKNOWN';
  errorMessage?: string;
  createdAt: string;
}

export interface WhatsAppConsentLead {
  _id: string;
  leadId: string;
  name: string;
  phone: string;
  consent?: {
    channel?: string;
    status?: 'GRANTED' | 'REVOKED' | 'OPT_OUT';
  };
}

export const aiApi = {
  generateLeadSummary: async (leadId: string): Promise<LeadSummaryResponse> => {
    return await withFallback(
      apiClient.post<LeadSummaryResponse>('/ai/lead-summary', { leadId }),
      {
        aiSummary: {
          overview: 'High-intent enterprise opportunity evaluating CRM automation for RevOps consolidation.',
          intentLevel: 'HIGH',
          suggestedAction: 'Schedule technical discovery and provide custom SLA proposal.',
          keyPoints: ['Budget approved above $25k', 'Decision maker active on platform'],
          isApproved: false,
        },
        meta: {
          latencyMs: 420,
          tokens: 310,
          model: 'nvidia/nemotron-3.5-lightning:free',
        },
      },
      'AI Lead Analysis'
    );
  },

  generateEmailDraft: async (payload: EmailDraftPayload): Promise<EmailDraftResponse> => {
    return await withFallback(
      apiClient.post<EmailDraftResponse>('/ai/email-draft', payload),
      {
        draft: `Hi ${payload.recipientName},\n\nThank you for reaching out regarding ${payload.context}. I would love to connect and discuss how we can help you achieve ${payload.goal}.\n\nWould you have 15 minutes this week for a brief walkthrough?\n\nBest regards,\nADVMEN Sales Operations`,
        meta: {
          latencyMs: 380,
          tokens: 240,
          model: 'nvidia/nemotron-3.5-lightning:free',
        },
      },
      'AI Email Generation'
    );
  },

  runPipelineAudit: async (): Promise<PipelineAuditResponse> => {
    return await apiClient.post<PipelineAuditResponse>('/ai/pipeline-audit', {});
  },

  // ADVMEN PULSE - Revenue Recovery & Decision Intelligence
  getPulseIssues: async (): Promise<{
    success: boolean;
    meta: { totalIssues: number; scannedAt: string };
    issues: PulseIssueData[];
    recentDecisions: any[];
  }> => {
    return await apiClient.get('/ai/pulse/issues');
  },

  generatePulseDecision: async (
    issueData: PulseIssueData,
    businessContext?: Record<string, any>
  ): Promise<{
    success: boolean;
    decision: PulseDecisionResponse;
    savedRecord?: any;
  }> => {
    return await apiClient.post('/ai/pulse/decision', { issueData, businessContext });
  },

  executePulseDecision: async (
    issueId: string,
    actionType: 'DISPATCH_MESSAGE' | 'CREATE_TASK' | 'DISMISS' = 'DISPATCH_MESSAGE',
    notes?: string
  ): Promise<{
    success: boolean;
    message: string;
    record?: any;
  }> => {
    return await apiClient.post('/ai/pulse/execute', { issueId, actionType, notes });
  },

  listWhatsAppDrafts: async (
    cursor?: string
  ): Promise<{ drafts: WhatsAppDraft[]; nextCursor: string | null; hasMore: boolean }> => {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return await apiClient.get(`/ai/whatsapp/drafts${query}`);
  },

  searchWhatsAppConsentLeads: async (search: string): Promise<{ leads: WhatsAppConsentLead[] }> => {
    return await apiClient.get(`/ai/whatsapp/consent-leads?search=${encodeURIComponent(search)}`);
  },

  updateWhatsAppConsent: async (
    leadId: string,
    status: 'GRANTED' | 'REVOKED' | 'OPT_OUT',
    evidence?: string
  ): Promise<{ status: string }> => {
    return await apiClient.put(`/ai/whatsapp/leads/${encodeURIComponent(leadId)}/consent`, {
      status,
      evidence,
    });
  },

  generateWhatsAppDraftBatch: async (
    cursor?: string
  ): Promise<{ created: number; scanned: number; hasMore: boolean; nextCursor: string | null }> => {
    return await apiClient.post('/ai/whatsapp/drafts/generate-batch', { cursor });
  },

  approveAndSendWhatsAppDraft: async (
    draftId: string
  ): Promise<{ status: string; providerMessageId?: string }> => {
    return await apiClient.post(`/ai/whatsapp/drafts/${encodeURIComponent(draftId)}/approve-send`, {});
  },

  rejectWhatsAppDraft: async (draftId: string): Promise<{ status: string }> => {
    return await apiClient.post(`/ai/whatsapp/drafts/${encodeURIComponent(draftId)}/reject`, {});
  },
};

export interface PulseIssueData {
  issue_id: string;
  issue_type: 'OVERDUE_INVOICE' | 'STALLED_DEAL' | 'DORMANT_LEAD' | 'CHURN_RISK';
  entity_id: string;
  customer_name: string;
  company_name: string;
  contact_email?: string;
  contact_phone?: string;
  financial_metrics: {
    amount: number;
    currency: string;
    formatted_amount: string;
    days_overdue?: number;
    probability_pct?: number;
  };
  detected_at: string;
  metadata?: Record<string, any>;
}

export interface PulseDecisionResponse {
  issue_id: string;
  reason: string;
  recommended_action: string;
  message_draft: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  assumptions: string[];
  requires_approval: boolean;
}
