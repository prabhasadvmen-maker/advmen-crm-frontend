import { Lead } from '@/types';
import { AIContentCard } from '@/components/patterns/AIContentCard';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { useUIStore } from '@/stores/uiStore';

interface LeadAISummaryCardProps {
  lead: Lead;
  onUpdateLead?: (lead: Lead) => void;
}

export function LeadAISummaryCard({ lead, onUpdateLead }: LeadAISummaryCardProps) {
  const { addToast } = useUIStore();

  if (!lead.aiSummary) return null;

  return (
    <WidgetBoundary name={`lead-ai-summary-${lead.id}`} skeletonVariant="card">
      <AIContentCard
        title="AI Copilot Qualification Insight"
        badgeLabel="Assistive Lead Intelligence"
        content={lead.aiSummary.overview}
        intentLevel={lead.aiSummary.intentLevel}
        suggestedAction={lead.aiSummary.suggestedAction}
        keyPoints={lead.aiSummary.keyPoints}
        status={lead.aiSummary.isApproved ? 'approved' : 'suggested'}
        onApprove={() => {
          addToast({
            type: 'ai',
            title: 'AI Insight Approved',
            message: 'Action items registered and synced with CRM record timeline.',
          });
          if (onUpdateLead) {
            onUpdateLead({
              ...lead,
              aiSummary: { ...lead.aiSummary!, isApproved: true },
            });
          }
        }}
        onDiscard={() => {
          addToast({
            type: 'info',
            title: 'Suggestion Discarded',
            message: 'Feedback recorded for model refinement.',
          });
        }}
        onApplyAction={() => {
          addToast({
            type: 'success',
            title: 'Action Queued',
            message: lead.aiSummary?.suggestedAction,
          });
        }}
      />
    </WidgetBoundary>
  );
}
