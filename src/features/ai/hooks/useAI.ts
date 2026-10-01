import { useMutation } from '@tanstack/react-query';
import { aiApi, EmailDraftPayload } from '../api/aiApi';
import { useUIStore } from '@/stores/uiStore';

export function useAI() {
  const { addToast } = useUIStore();

  const leadSummaryMutation = useMutation({
    mutationFn: (leadId: string) => aiApi.generateLeadSummary(leadId),
    onSuccess: (data) => {
      addToast({
        type: 'ai',
        title: 'AI Analysis Ready',
        message: `Generated via ${data.meta.model} in ${data.meta.latencyMs}ms.`,
      });
    },
  });

  const emailDraftMutation = useMutation({
    mutationFn: (payload: EmailDraftPayload) => aiApi.generateEmailDraft(payload),
    onSuccess: (data) => {
      addToast({
        type: 'ai',
        title: 'AI Draft Created',
        message: `Outreach email drafted via ${data.meta.model}.`,
      });
    },
  });

  return {
    generateLeadSummary: leadSummaryMutation.mutateAsync,
    isAnalyzingLead: leadSummaryMutation.isPending,
    generateEmailDraft: emailDraftMutation.mutateAsync,
    isDraftingEmail: emailDraftMutation.isPending,
  };
}
