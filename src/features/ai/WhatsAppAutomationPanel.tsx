import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, LoaderCircle, MessageCircle, Search, Send, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/stores/uiStore';
import { aiApi, WhatsAppConsentLead, WhatsAppDraft } from './api/aiApi';

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function WhatsAppAutomationPanel() {
  const { addToast } = useUIStore();
  const [drafts, setDrafts] = useState<WhatsAppDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [draftsCursor, setDraftsCursor] = useState<string | null>(null);
  const [hasMoreDrafts, setHasMoreDrafts] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isActingOn, setIsActingOn] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState({ scanned: 0, created: 0 });
  const [consentSearch, setConsentSearch] = useState('');
  const [consentLeads, setConsentLeads] = useState<WhatsAppConsentLead[]>([]);
  const [consentEvidence, setConsentEvidence] = useState<Record<string, string>>({});
  const [isSearchingConsent, setIsSearchingConsent] = useState(false);
  const [consentActionLeadId, setConsentActionLeadId] = useState<string | null>(null);
  const cancelGeneration = useRef(false);

  const loadDrafts = useCallback(async (cursor?: string, append = false) => {
    if (append) setIsLoadingOlder(true);
    else setIsLoading(true);
    try {
      const response = await aiApi.listWhatsAppDrafts(cursor);
      setDrafts((current) => (append ? [...current, ...(response.drafts || [])] : response.drafts || []));
      setDraftsCursor(response.nextCursor);
      setHasMoreDrafts(response.hasMore);
    } catch (error) {
      addToast({
        type: 'danger',
        title: 'Could not load WhatsApp drafts',
        message: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoading(false);
      setIsLoadingOlder(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  const generateAllDrafts = async () => {
    setIsGenerating(true);
    cancelGeneration.current = false;
    setGenerationProgress({ scanned: 0, created: 0 });
    let cursor: string | undefined;
    let hasMore = true;
    let scanned = 0;
    let created = 0;
    try {
      while (hasMore && !cancelGeneration.current) {
        const batch = await aiApi.generateWhatsAppDraftBatch(cursor);
        scanned += batch.scanned;
        created += batch.created;
        cursor = batch.nextCursor || undefined;
        hasMore = batch.hasMore;
        setGenerationProgress({ scanned, created });
      }
      addToast({
        type: 'success',
        title: cancelGeneration.current ? 'Draft generation paused' : 'Draft generation complete',
        message: `${created} new drafts created after scanning ${scanned} eligible-consent records.`,
      });
    } catch (error) {
      addToast({
        type: 'danger',
        title: 'Draft generation stopped',
        message: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsGenerating(false);
      await loadDrafts();
    }
  };

  const approveAndSend = async (draft: WhatsAppDraft) => {
    setIsActingOn(draft._id);
    try {
      await aiApi.approveAndSendWhatsAppDraft(draft._id);
      addToast({
        type: 'success',
        title: 'WhatsApp message sent',
        message: `Meta accepted the message to ${draft.leadName}.`,
      });
      await loadDrafts();
    } catch (error) {
      addToast({
        type: 'danger',
        title: 'Message was not sent',
        message: error instanceof Error ? error.message : 'Please review the draft and try again.',
      });
      await loadDrafts();
    } finally {
      setIsActingOn(null);
    }
  };

  const rejectDraft = async (draft: WhatsAppDraft) => {
    setIsActingOn(draft._id);
    try {
      await aiApi.rejectWhatsAppDraft(draft._id);
      await loadDrafts();
    } catch (error) {
      addToast({
        type: 'danger',
        title: 'Draft could not be rejected',
        message: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsActingOn(null);
    }
  };

  const pendingCount = drafts.filter((draft) => draft.status === 'PENDING_APPROVAL').length;

  const searchLeads = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (consentSearch.trim().length < 2) return;
    setIsSearchingConsent(true);
    try {
      const response = await aiApi.searchWhatsAppConsentLeads(consentSearch.trim());
      setConsentLeads(response.leads || []);
    } catch (error) {
      addToast({
        type: 'danger',
        title: 'Lead search failed',
        message: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSearchingConsent(false);
    }
  };

  const updateConsent = async (
    lead: WhatsAppConsentLead,
    status: 'GRANTED' | 'REVOKED'
  ) => {
    setConsentActionLeadId(lead._id);
    try {
      await aiApi.updateWhatsAppConsent(
        lead._id,
        status,
        status === 'GRANTED' ? consentEvidence[lead._id] : undefined
      );
      addToast({
        type: 'success',
        title: status === 'GRANTED' ? 'WhatsApp consent recorded' : 'WhatsApp consent revoked',
        message: `${lead.name}'s consent record was updated.`,
      });
      const response = await aiApi.searchWhatsAppConsentLeads(consentSearch.trim());
      setConsentLeads(response.leads || []);
      setConsentEvidence((current) => ({ ...current, [lead._id]: '' }));
    } catch (error) {
      addToast({
        type: 'danger',
        title: 'Consent was not updated',
        message: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setConsentActionLeadId(null);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            WhatsApp follow-up drafts
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-neutral-500">
            Drafts use open employee queries and verified outstanding balances. Only leads with recorded,
            explicit WhatsApp consent and an international phone number are included. Every send requires
            your approval.
          </p>
        </div>
        <Button
          variant="ai"
          size="sm"
          isLoading={isGenerating}
          icon={<MessageCircle className="h-3.5 w-3.5" />}
          onClick={() => void generateAllDrafts()}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating drafts…' : 'Generate drafts for eligible leads'}
        </Button>
      </div>

      {isGenerating && (
        <div className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-900">
          <span className="flex items-center gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Scanned {generationProgress.scanned}; created {generationProgress.created} draft(s).
          </span>
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              cancelGeneration.current = true;
            }}
          >
            Pause
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Sending requires backend Meta credentials and an approved template. Existing web-form consent alone
        does not qualify as WhatsApp consent.
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h3 className="text-sm font-bold text-neutral-900">WhatsApp consent records</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Record opt-in only after verifying the customer explicitly agreed to WhatsApp follow-ups. Add a short
          source reference as evidence; do not use a web-form or phone number alone as consent.
        </p>
        <form className="mt-3 flex gap-2" onSubmit={(event) => void searchLeads(event)}>
          <input
            value={consentSearch}
            onChange={(event) => setConsentSearch(event.target.value)}
            placeholder="Search by lead name, phone, or lead ID"
            className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
            minLength={2}
          />
          <Button type="submit" variant="outline" size="sm" isLoading={isSearchingConsent} icon={<Search className="h-3.5 w-3.5" />}>
            Search
          </Button>
        </form>
        {consentLeads.length > 0 && (
          <div className="mt-3 divide-y divide-neutral-100">
            {consentLeads.map((lead) => {
              const hasWhatsAppConsent =
                lead.consent?.channel === 'WHATSAPP' && lead.consent.status === 'GRANTED';
              return (
                <div key={lead._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">{lead.name} · {lead.phone}</p>
                    <p className={`mt-0.5 text-[11px] ${hasWhatsAppConsent ? 'text-emerald-700' : 'text-neutral-500'}`}>
                      {hasWhatsAppConsent ? 'WhatsApp opt-in active' : `Consent: ${lead.consent?.status || 'not recorded'}`}
                    </p>
                  </div>
                  {hasWhatsAppConsent ? (
                    <Button
                      variant="danger"
                      size="xs"
                      disabled={consentActionLeadId === lead._id}
                      isLoading={consentActionLeadId === lead._id}
                      onClick={() => void updateConsent(lead, 'REVOKED')}
                    >
                      Revoke consent
                    </Button>
                  ) : (
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[22rem]">
                      <input
                        value={consentEvidence[lead._id] || ''}
                        onChange={(event) =>
                          setConsentEvidence((current) => ({ ...current, [lead._id]: event.target.value }))
                        }
                        placeholder="Evidence reference (e.g. opt-in date/source)"
                        className="rounded-md border border-neutral-300 px-3 py-2 text-xs"
                      />
                      <Button
                        variant="success"
                        size="xs"
                        disabled={consentActionLeadId === lead._id || (consentEvidence[lead._id] || '').trim().length < 5}
                        isLoading={consentActionLeadId === lead._id}
                        onClick={() => void updateConsent(lead, 'GRANTED')}
                      >
                        Record verified WhatsApp opt-in
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white p-10 text-sm text-neutral-500">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading database drafts…
        </div>
      ) : drafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <MessageCircle className="mx-auto h-8 w-8 text-neutral-300" />
          <h3 className="mt-3 text-sm font-bold text-neutral-800">No WhatsApp drafts yet</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Generate drafts to scan consented leads with open queries or an outstanding balance.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            {pendingCount} awaiting approval · {drafts.length} recent database draft(s)
          </p>
          {drafts.map((draft) => (
            <article key={draft._id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{draft.leadName}</h3>
                  <p className="mt-0.5 text-xs text-neutral-500">{draft.recipientPhone}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    draft.status === 'SENT'
                      ? 'bg-emerald-100 text-emerald-800'
                      : draft.status === 'FAILED'
                        ? 'bg-rose-100 text-rose-800'
                        : draft.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  {draft.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="mt-3 grid gap-2 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700 sm:grid-cols-2">
                <span>Outstanding balance: <strong>{formatAmount(draft.outstandingAmount, draft.currency)}</strong></span>
                {draft.queryText && <span className="sm:text-right">Open query: {draft.queryText}</span>}
              </div>

              <p className="mt-3 whitespace-pre-wrap rounded-lg border border-neutral-200 p-3 text-sm text-neutral-800">
                {draft.message}
              </p>
              {draft.errorMessage && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-rose-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {draft.errorMessage}
                </p>
              )}

              {(draft.status === 'PENDING_APPROVAL' || draft.status === 'FAILED') && (
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isActingOn === draft._id}
                    icon={<X className="h-3.5 w-3.5" />}
                    onClick={() => void rejectDraft(draft)}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={isActingOn === draft._id}
                    disabled={isActingOn === draft._id}
                    icon={draft.status === 'FAILED' ? <Send className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    onClick={() => void approveAndSend(draft)}
                  >
                    Approve &amp; send
                  </Button>
                </div>
              )}
            </article>
          ))}
          {hasMoreDrafts && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                isLoading={isLoadingOlder}
                disabled={isLoadingOlder || !draftsCursor}
                onClick={() => void loadDrafts(draftsCursor || undefined, true)}
              >
                Load older drafts
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
