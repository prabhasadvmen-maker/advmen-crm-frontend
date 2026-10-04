import { useState, useEffect, useMemo, useCallback } from 'react';
import { AIContentCard } from '@/components/patterns/AIContentCard';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/stores/uiStore';
import { useSessionStore } from '@/stores/sessionStore';
import { WhatsAppAutomationPanel } from './WhatsAppAutomationPanel';
import {
  Sparkles,
  Zap,
  BrainCircuit,
  CheckCheck,
  ShieldCheck,
  AlertTriangle,
  Send,
  Copy,
  Check,
  RefreshCw,
  User,
  ArrowRight,
  Code2,
  Lock,
} from 'lucide-react';
import {
  aiApi,
  PulseIssueData,
  PulseDecisionResponse,
} from './api/aiApi';

interface AIRecommendation {
  id: string;
  title: string;
  intentLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  content: string;
  keyPoints: string[];
  suggestedAction: string;
}

export function AICenterPage() {
  const { addToast } = useUIStore();
  const { organizationName, user } = useSessionStore();
  const isAdmin = user.role === 'ORG_ADMIN' || user.role === 'SUPER_ADMIN';

  // Active Center Mode Tab: revenue pulse, pipeline audit, or admin WhatsApp drafts.
  const [activeTab, setActiveTab] = useState<'PULSE' | 'AUDIT' | 'WHATSAPP'>('PULSE');

  // ==========================================
  // ADVMEN PULSE STATE (Revenue-Recovery Engine)
  // ==========================================
  const [issues, setIssues] = useState<PulseIssueData[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<PulseIssueData | null>(null);
  const [activeDecision, setActiveDecision] = useState<PulseDecisionResponse | null>(null);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [issuesLoadError, setIssuesLoadError] = useState('');
  const [isGeneratingDecision, setIsGeneratingDecision] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [issueFilter, setIssueFilter] = useState<'ALL' | 'OVERDUE_INVOICE' | 'STALLED_DEAL' | 'DORMANT_LEAD'>('ALL');
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [showJsonInspector, setShowJsonInspector] = useState(false);
  const [approvedDecisionsCount, setApprovedDecisionsCount] = useState(0);

  // Fetch Live Issues from MongoDB via Rules Engine
  const loadPulseIssues = useCallback(async () => {
    setIsLoadingIssues(true);
    try {
      const res = await aiApi.getPulseIssues();
      const detected = res?.issues || [];
      setIssues(detected);
      setIssuesLoadError('');
      if (detected.length > 0 && !selectedIssue) {
        setSelectedIssue(detected[0]);
      }
    } catch {
      setIssues([]);
      setSelectedIssue(null);
      setIssuesLoadError('Could not load live revenue issues from the database. Retry to load current records.');
    } finally {
      setIsLoadingIssues(false);
    }
  }, [selectedIssue]);

  useEffect(() => {
    loadPulseIssues();
  }, [loadPulseIssues]);

  // Generate AI Decision for currently selected issue
  const handleGenerateDecision = async (issue: PulseIssueData) => {
    setIsGeneratingDecision(true);
    setActiveDecision(null);
    try {
      const res = await aiApi.generatePulseDecision(issue, {
        organization_name: organizationName || 'ADVMEN Platform',
        brand_tone: 'PROFESSIONAL',
        escalation_tier: (issue.financial_metrics.days_overdue || 0) > 30 ? 2 : 1,
      });

      if (res?.decision) {
        setActiveDecision(res.decision);
        addToast({
          type: 'ai',
          title: 'Pulse Decision Synthesized',
          message: `Generated structured recommendation with ${res.decision.confidence} confidence.`,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Decision Generation Failed',
        message: err?.message || 'Could not synthesize AI decision.',
      });
    } finally {
      setIsGeneratingDecision(false);
    }
  };

  // Human-in-the-Loop Action Approval
  const handleApproveAction = async () => {
    if (!selectedIssue || !activeDecision) return;
    setIsExecutingAction(true);
    try {
      const res = await aiApi.executePulseDecision(
        selectedIssue.issue_id,
        'DISPATCH_MESSAGE',
        `Approved by operator. Outreach: ${activeDecision.recommended_action}`
      );
      setApprovedDecisionsCount((c) => c + 1);
      addToast({
        type: 'success',
        title: 'Action Approved & Task Created',
        message: res.message || 'Follow-up registered in CRM Tasks & Activities.',
      });
      // Remove or mark issue
      setIssues((prev) => prev.filter((i) => i.issue_id !== selectedIssue.issue_id));
      setSelectedIssue(null);
      setActiveDecision(null);
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Execution Failed',
        message: err?.message || 'Could not approve action.',
      });
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleCopyDraft = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    addToast({
      type: 'info',
      title: 'Draft Copied to Clipboard',
      message: 'Ready to paste into WhatsApp, Email, or Slack.',
    });
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  // Filtered Issues
  const filteredIssues = useMemo(() => {
    if (issueFilter === 'ALL') return issues;
    return issues.filter((i) => i.issue_type === issueFilter);
  }, [issues, issueFilter]);

  // Total At-Risk Calculation (Code = Truth)
  const totalAtRisk = useMemo(() => {
    return issues.reduce((sum, i) => sum + (i.financial_metrics.amount || 0), 0);
  }, [issues]);

  // ==========================================
  // ORIGINAL PIPELINE AUDIT STATE
  // ==========================================
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [auditApprovedCount, setAuditApprovedCount] = useState(0);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [auditMeta, setAuditMeta] = useState<{ totalDeals: number; totalLeads: number; model: string } | null>(null);

  const handleRunAudit = async () => {
    setIsRunningAudit(true);
    try {
      const response = await aiApi.runPipelineAudit();
      const recs = response?.recommendations || [];
      setRecommendations(recs);
      if (response?.meta) {
        setAuditMeta({
          totalDeals: response.meta.totalDeals,
          totalLeads: response.meta.totalLeads,
          model: response.meta.model,
        });
      }

      addToast({
        type: 'ai',
        title: 'Live Pipeline Audit Complete',
        message: `Generated ${recs.length} actionable recommendations from database records.`,
      });
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Audit Failed',
        message: err?.message || 'Could not complete AI pipeline audit.',
      });
    } finally {
      setIsRunningAudit(false);
    }
  };

  return (
    <div className="space-y-fib-21">
      {/* Primary Header */}
      <div className="flex flex-wrap items-center justify-between gap-fib-13 pb-fib-8 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-sm">
                <BrainCircuit className="w-5 h-5" />
              </span>
              ADVMEN PULSE — AI Decision & Revenue Recovery
            </h1>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 uppercase font-mono">
              GPT-4o Structured Output
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            <strong>Code = Truth, AI = Intelligence, APIs = Action.</strong> Live revenue-recovery decision layer powered by MongoDB deterministic rules.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl text-xs font-bold border border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveTab('PULSE')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'PULSE'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Revenue Recovery Pulse</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'AUDIT'
                ? 'bg-white text-violet-700 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <span>Full Pipeline Audit</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('WHATSAPP')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'WHATSAPP'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp Approval</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'WHATSAPP' && isAdmin && <WhatsAppAutomationPanel />}

      {/* ============================================================== */}
      {/* TAB 1: ADVMEN PULSE REVENUE-RECOVERY & DECISION ENGINE          */}
      {/* ============================================================== */}
      {activeTab === 'PULSE' && (
        <div className="space-y-6">
          {issuesLoadError && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <span>{issuesLoadError}</span>
              <Button variant="outline" size="xs" onClick={() => void loadPulseIssues()}>
                Retry
              </Button>
            </div>
          )}
          {/* Top KPI Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-fib-13">
            <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Total Revenue at Risk (Database)
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-rose-600">
                  ₹{totalAtRisk.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {issues.length} Issues
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Overdue invoices & stalled high-value deals
              </p>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Deterministic Engine (Code = Truth)
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-neutral-900">
                  100% Math Verified
                </span>
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-[11px] text-neutral-500">
                Amounts, due dates & days overdue never calculated by AI
              </p>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Human-in-the-Loop Guardrail
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-indigo-700">
                  Approval Required
                </span>
                <Lock className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-[11px] text-neutral-500">
                requires_approval = true strictly enforced
              </p>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Actions Executed
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-emerald-600">
                  {approvedDecisionsCount} Approved
                </span>
                <CheckCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-[11px] text-neutral-500">
                Reminders dispatched & CRM tasks queued
              </p>
            </div>
          </div>

          {/* Issue Category Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50 border border-neutral-200 p-2.5 rounded-xl">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-neutral-700 mr-2">Filter Leaks:</span>
              <button
                type="button"
                onClick={() => setIssueFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  issueFilter === 'ALL'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                All Issues ({issues.length})
              </button>
              <button
                type="button"
                onClick={() => setIssueFilter('OVERDUE_INVOICE')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  issueFilter === 'OVERDUE_INVOICE'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                }`}
              >
                🚨 Overdue Invoices ({issues.filter((i) => i.issue_type === 'OVERDUE_INVOICE').length})
              </button>
              <button
                type="button"
                onClick={() => setIssueFilter('STALLED_DEAL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  issueFilter === 'STALLED_DEAL'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
                }`}
              >
                ⏳ Stalled Deals ({issues.filter((i) => i.issue_type === 'STALLED_DEAL').length})
              </button>
              <button
                type="button"
                onClick={() => setIssueFilter('DORMANT_LEAD')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  issueFilter === 'DORMANT_LEAD'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                }`}
              >
                👤 Dormant Leads ({issues.filter((i) => i.issue_type === 'DORMANT_LEAD').length})
              </button>
            </div>

            <button
              type="button"
              onClick={loadPulseIssues}
              disabled={isLoadingIssues}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-neutral-200 rounded-lg shadow-2xs"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingIssues ? 'animate-spin' : ''}`} />
              <span>Rescan Database</span>
            </button>
          </div>

          {/* Two-Column Workspace: Left = Live Issues Feed, Right = AI Decision Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Detected Issues List */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Detected Leaks in Database ({filteredIssues.length})</span>
                </h3>
                <span className="text-[10px] text-neutral-400 font-mono">Live Sync</span>
              </div>

              {filteredIssues.length === 0 ? (
                <div className="p-8 bg-white rounded-xl border border-neutral-200 text-center space-y-2">
                  <CheckCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-neutral-800">No Active Leaks in this Filter</p>
                  <p className="text-[11px] text-neutral-500">All scanned records are currently up to date.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                  {filteredIssues.map((issue) => {
                    const isSelected = selectedIssue?.issue_id === issue.issue_id;
                    const isOverdue = issue.issue_type === 'OVERDUE_INVOICE';

                    return (
                      <div
                        key={issue.issue_id}
                        onClick={() => {
                          setSelectedIssue(issue);
                          setActiveDecision(null);
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/60 border-indigo-300 shadow-sm ring-2 ring-indigo-200'
                            : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isOverdue
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : issue.issue_type === 'STALLED_DEAL'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {issue.issue_type.replace('_', ' ')}
                          </span>

                          <span className="font-mono text-xs font-extrabold text-neutral-900">
                            {issue.financial_metrics.formatted_amount}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-neutral-900 flex items-center justify-between">
                            <span className="truncate">{issue.company_name}</span>
                            {issue.financial_metrics.days_overdue && (
                              <span className="text-[10px] font-mono text-rose-600 font-semibold shrink-0">
                                {issue.financial_metrics.days_overdue}d overdue
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-neutral-400" />
                            <span>{issue.customer_name}</span>
                            <span>•</span>
                            <span className="font-mono text-[10px]">{issue.entity_id}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: AI Decision & Messaging Synthesis Card */}
            <div className="lg:col-span-7">
              {selectedIssue ? (
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-md p-5 space-y-4">
                  {/* Selected Issue Meta Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block font-mono">
                        Target Issue: {selectedIssue.issue_id}
                      </span>
                      <h3 className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
                        <span>{selectedIssue.company_name}</span>
                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {selectedIssue.financial_metrics.formatted_amount}
                        </span>
                      </h3>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      isLoading={isGeneratingDecision}
                      icon={<Sparkles className="w-3.5 h-3.5" />}
                      onClick={() => handleGenerateDecision(selectedIssue)}
                      className="bg-indigo-600 hover:bg-indigo-700 shadow-sm font-bold text-xs"
                    >
                      {isGeneratingDecision ? 'Synthesizing Decision...' : 'Generate AI Decision'}
                    </Button>
                  </div>

                  {/* Decision Content or Placeholder */}
                  {!activeDecision && !isGeneratingDecision && (
                    <div className="p-10 border-2 border-dashed border-neutral-200 rounded-xl text-center space-y-3">
                      <BrainCircuit className="w-10 h-10 text-indigo-400 mx-auto" />
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900">
                          Ready for AI Decision Synthesis
                        </h4>
                        <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                          Click "Generate AI Decision" to run OpenAI GPT-4o with strict JSON Schema. The AI will explain why this matters, propose the next best action, and draft a personalized outreach message.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleGenerateDecision(selectedIssue)}
                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold"
                      >
                        ⚡ Run Decision Engine
                      </Button>
                    </div>
                  )}

                  {isGeneratingDecision && (
                    <div className="p-12 text-center space-y-3">
                      <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                      <p className="text-xs font-bold text-neutral-800">
                        Synthesizing Decision & Crafting Outreach...
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Applying schema guardrails and verifying mathematical anchors.
                      </p>
                    </div>
                  )}

                  {activeDecision && (
                    <div className="space-y-4 animate-in fade-in">
                      {/* Reason & Impact Card */}
                      <div className="p-3.5 bg-gradient-to-r from-indigo-50/70 to-blue-50/50 rounded-xl border border-indigo-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                            Business Impact & Rationale (AI = Intelligence)
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              activeDecision.confidence === 'HIGH'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}
                          >
                            Confidence: {activeDecision.confidence}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-neutral-900 leading-relaxed">
                          {activeDecision.reason}
                        </p>
                      </div>

                      {/* Recommended Action */}
                      <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                          Recommended Next Action
                        </span>
                        <p className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{activeDecision.recommended_action}</span>
                        </p>
                      </div>

                      {/* Personalized Outreach Draft (WhatsApp / Email) */}
                      <div className="bg-white rounded-xl border-2 border-indigo-200 p-4 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-neutral-900 flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Personalized Outreach Draft (WhatsApp / Email)</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCopyDraft(activeDecision.message_draft)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                          >
                            {copiedDraft ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedDraft ? 'Copied!' : 'Copy Draft'}</span>
                          </button>
                        </div>

                        <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 font-sans text-xs text-neutral-900 whitespace-pre-wrap leading-relaxed">
                          {activeDecision.message_draft}
                        </div>
                      </div>

                      {/* Assumptions & Guardrails */}
                      <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                            Explicit Assumptions Made by AI
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Lock className="w-3 h-3" />
                            Human Approval Required
                          </span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-neutral-600">
                          {activeDecision.assumptions.map((assump, idx) => (
                            <li key={idx}>{assump}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Action Approval Buttons (APIs = Action) */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() => setShowJsonInspector((v) => !v)}
                          className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 flex items-center gap-1 font-mono"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>{showJsonInspector ? 'Hide Schema JSON' : 'Inspect Strict JSON'}</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setActiveDecision(null)}
                          >
                            Regenerate
                          </Button>

                          <Button
                            size="sm"
                            variant="primary"
                            isLoading={isExecutingAction}
                            icon={<CheckCheck className="w-3.5 h-3.5" />}
                            onClick={handleApproveAction}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md text-xs"
                          >
                            Approve & Queue CRM Task
                          </Button>
                        </div>
                      </div>

                      {/* Raw Structured JSON Output Inspector */}
                      {showJsonInspector && (
                        <div className="p-3.5 bg-neutral-900 rounded-xl border border-neutral-800 font-mono text-[11px] text-emerald-400 overflow-x-auto space-y-1">
                          <div className="text-[10px] text-neutral-400 pb-1 border-b border-neutral-800 flex items-center justify-between">
                            <span>OpenAI JSON Schema Compliant Output</span>
                            <span>strict: true</span>
                          </div>
                          <pre>{JSON.stringify(activeDecision, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-16 bg-white rounded-2xl border border-neutral-200 text-center space-y-3">
                  <BrainCircuit className="w-12 h-12 text-neutral-300 mx-auto" />
                  <h3 className="text-sm font-bold text-neutral-800">Select an Issue from the Left</h3>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                    Choose any overdue invoice, stalled deal, or dormant prospect to run the ADVMEN PULSE decision layer.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: ORIGINAL PIPELINE AUDIT                                 */}
      {/* ============================================================== */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-neutral-200">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Workspace Autonomous Pipeline Copilot
              </h3>
              <p className="text-xs text-neutral-500">
                Audit all active opportunities, evaluate conversion health, and scan stage transitions.
              </p>
            </div>
            <Button
              variant="ai"
              size="sm"
              isLoading={isRunningAudit}
              icon={<Zap className="w-3.5 h-3.5" />}
              onClick={handleRunAudit}
            >
              {isRunningAudit ? 'Auditing Database...' : 'Run Full Pipeline Audit'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-fib-13">
            <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100 text-violet-700">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400 block tracking-wider">
                  Audit Coverage
                </span>
                <span className="text-sm font-bold text-neutral-900">
                  {auditMeta ? `${auditMeta.totalDeals} Deals & ${auditMeta.totalLeads} Leads` : 'Live Workspace'}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400 block tracking-wider">
                  Approved Items
                </span>
                <span className="text-sm font-bold text-neutral-900">
                  {auditApprovedCount} Executed
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400 block tracking-wider">
                  Recommendations Active
                </span>
                <span className="text-sm font-bold text-blue-700">
                  {recommendations.length} Pending
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Recommendations Feed
            </h3>

            {recommendations.length === 0 ? (
              <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center space-y-2">
                <BrainCircuit className="w-10 h-10 text-neutral-300 mx-auto" />
                <h4 className="text-sm font-bold text-neutral-800">No Pending AI Risk Alerts</h4>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  Click 'Run Full Pipeline Audit' to scan all active database opportunities.
                </p>
              </div>
            ) : (
              recommendations.map((rec) => (
                <WidgetBoundary key={rec.id} name={`ai-center-${rec.id}`}>
                  <AIContentCard
                    title={rec.title}
                    intentLevel={rec.intentLevel}
                    content={rec.content}
                    keyPoints={rec.keyPoints}
                    suggestedAction={rec.suggestedAction}
                    onApprove={() => {
                      setAuditApprovedCount((c) => c + 1);
                      setRecommendations((prev) => prev.filter((r) => r.id !== rec.id));
                      addToast({
                        type: 'ai',
                        title: 'AI Action Executed',
                        message: rec.suggestedAction,
                      });
                    }}
                    onDiscard={() => {
                      setRecommendations((prev) => prev.filter((r) => r.id !== rec.id));
                      addToast({
                        type: 'info',
                        title: 'Suggestion Dismissed',
                        message: 'Logged feedback.',
                      });
                    }}
                    onApplyAction={() => {
                      setAuditApprovedCount((c) => c + 1);
                      setRecommendations((prev) => prev.filter((r) => r.id !== rec.id));
                      addToast({
                        type: 'success',
                        title: 'Action Triggered',
                        message: rec.suggestedAction,
                      });
                    }}
                  />
                </WidgetBoundary>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
