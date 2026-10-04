import { useState, useMemo, useEffect, useCallback } from 'react';
import { Deal, DealStage } from '@/types';
import { KanbanBoard, KanbanColumn } from '@/components/patterns/KanbanBoard';
import { KPICard } from '@/components/patterns/KPICard';
import { SlideOverPanel } from '@/components/patterns/SlideOverPanel';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusPill } from '@/components/patterns/StatusPill';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { PermissionGate } from '@/components/system/PermissionGate';
import { Avatar } from '@/components/ui/Avatar';
import { useUIStore } from '@/stores/uiStore';
import { FinalizedLead, leadApi } from '@/features/leads/api/leadApi';
import { cn } from '@/utils/cn';
import { useSessionStore } from '@/stores/sessionStore';
import { invoiceApi } from '@/features/invoices/api/invoiceApi';
import {
  Plus,
  DollarSign,
  TrendingUp,
  Award,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Phone,
  Copy,
  MessageSquare,
  Search,
  RefreshCw,
  Eye,
  Kanban,
  X,
  BadgeCheck,
} from 'lucide-react';

import { useDeals } from './hooks/useDeals';

export function DealsPage() {
  const { user } = useSessionStore();
  const canViewDeals = user.permissions.includes('deal.view');
  const canViewAllFinalized = ['SUPER_ADMIN', 'ORG_ADMIN', 'SALES_MANAGER'].includes(user.role);
  const canRecordPayment = user.role === 'SUPER_ADMIN' || user.role === 'ORG_ADMIN';
  const { deals, createDeal, moveStage, deleteDeal, isDeleting, isCreating } = useDeals(canViewDeals);
  const { addToast } = useUIStore();
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedFinalizedLead, setSelectedFinalizedLead] = useState<FinalizedLead | null>(null);
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  const [paymentLead, setPaymentLead] = useState<FinalizedLead | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState<'FINALIZED' | 'KANBAN'>('FINALIZED');
  const [stageFilter, setStageFilter] = useState<'ALL' | 'ACTIVE' | 'WON'>('ALL');

  // Finalized Leads from Database
  const [finalizedLeads, setFinalizedLeads] = useState<FinalizedLead[]>([]);
  const [isLoadingFinalized, setIsLoadingFinalized] = useState(false);
  const [finalizedError, setFinalizedError] = useState('');
  const [finalizedSearch, setFinalizedSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');

  const fetchFinalizedData = useCallback(async () => {
    setIsLoadingFinalized(true);
    setFinalizedError('');
    try {
      const data = canViewAllFinalized
        ? await leadApi.getFinalizedLeads()
        : await leadApi.getMyFinalizedLeads();
      setFinalizedLeads(data || []);
    } catch (error) {
      setFinalizedError(error instanceof Error ? error.message : 'Unable to load completed leads.');
    } finally {
      setIsLoadingFinalized(false);
    }
  }, [canViewAllFinalized]);

  const openPaymentDialog = (lead: FinalizedLead) => {
    setPaymentLead(lead);
    setPaymentAmount('');
  };

  const handleRecordLeadPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!paymentLead) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast({
        type: 'warning',
        title: 'Enter payment amount',
        message: 'Received amount must be greater than zero.',
      });
      return;
    }

    setIsRecordingPayment(true);
    try {
      const payment = await invoiceApi.recordFinalizedLeadPayment(paymentLead.id, amount);
      const totalAmount = paymentLead.clearedInfo?.dealValue ?? paymentLead.budget ?? 0;
      const totalPaid = (paymentLead.clearedInfo?.paymentTotalPaid || 0) + amount;
      const pendingAmount = Math.max(0, totalAmount - totalPaid);
      setFinalizedLeads((current) =>
        current.map((lead) =>
          lead.id === paymentLead.id
            ? {
                ...lead,
                clearedInfo: {
                  ...lead.clearedInfo,
                  paymentInvoiceId: payment.id,
                  paymentRecordedAt: payment.paidAt || new Date().toISOString(),
                  paymentTotalPaid: totalPaid,
                },
              }
            : lead
        )
      );
      setSelectedFinalizedLead((current) =>
        current?.id === paymentLead.id
          ? {
              ...current,
              clearedInfo: {
                ...current.clearedInfo,
                paymentInvoiceId: payment.id,
                paymentRecordedAt: payment.paidAt || new Date().toISOString(),
                paymentTotalPaid: totalPaid,
              },
            }
          : current
      );
      setPaymentLead(null);
      addToast({
        type: 'success',
        title: pendingAmount === 0 ? 'Payment completed' : 'Partial payment recorded',
        message: pendingAmount === 0
          ? `₹${payment.amount.toLocaleString('en-IN')} saved. The full deal amount is paid.`
          : `₹${payment.amount.toLocaleString('en-IN')} recorded. ₹${pendingAmount.toLocaleString('en-IN')} is still pending.`,
      });
    } catch (error) {
      addToast({
        type: 'danger',
        title: 'Payment not recorded',
        message: error instanceof Error ? error.message : 'Could not save the payment.',
      });
    } finally {
      setIsRecordingPayment(false);
    }
  };

  useEffect(() => {
    fetchFinalizedData();
  }, [fetchFinalizedData]);

  // Form State
  const [newDealTitle, setNewDealTitle] = useState('');
  const [newDealCompany, setNewDealCompany] = useState('');
  const [newDealContact, setNewDealContact] = useState('');
  const [newDealValue, setNewDealValue] = useState('75000');
  const [newDealStage, setNewDealStage] = useState<DealStage>('DISCOVERY');
  const [newDealCloseDate, setNewDealCloseDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  const stages: KanbanColumn[] = [
    { id: 'DISCOVERY', label: 'Discovery', accent: 'neutral' },
    { id: 'QUALIFICATION', label: 'Qualification', accent: 'amber' },
    { id: 'PROPOSAL', label: 'Proposal', accent: 'blue' },
    { id: 'NEGOTIATION', label: 'Negotiation', accent: 'amber' },
    { id: 'WON', label: 'Closed Won', accent: 'green' },
    { id: 'LOST', label: 'Lost', accent: 'rose' },
  ];

  const visibleStages = useMemo(() => {
    if (stageFilter === 'ACTIVE') {
      return stages.filter((s) => s.id !== 'WON' && s.id !== 'LOST');
    }
    if (stageFilter === 'WON') {
      return stages.filter((s) => s.id === 'WON');
    }
    return stages;
  }, [stages, stageFilter]);

  const handleMoveStage = (dealId: string, newStage: DealStage) => {
    moveStage(dealId, newStage);
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealTitle.trim() || !newDealCompany.trim()) return;

    await createDeal({
      title: newDealTitle.trim(),
      company: newDealCompany.trim(),
      contactName: newDealContact.trim() || 'Key Contact',
      value: Number(newDealValue) || 75000,
      stage: newDealStage,
      probability: newDealStage === 'WON' ? 100 : 50,
      expectedCloseDate: newDealCloseDate || new Date(Date.now() + 30 * 86400000).toISOString(),
    });

    setIsNewDealOpen(false);
    setNewDealTitle('');
    setNewDealCompany('');
    setNewDealContact('');
  };

  const totalWonValue = useMemo(() => {
    const fromLeads = finalizedLeads.reduce((sum, l) => sum + (l.clearedInfo?.dealValue || l.budget || 0), 0);
    const fromDeals = deals.filter((d) => d.stage === 'WON').reduce((sum, d) => sum + (d.value || 0), 0);
    return Math.max(fromLeads, fromDeals);
  }, [finalizedLeads, deals]);

  // List of unique employees from finalized leads
  const uniqueEmployees = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of finalizedLeads) {
      const empName = l.clearedInfo?.clearedBy?.name || l.assignedTo?.name;
      if (empName) map.set(empName, empName);
    }
    return Array.from(map.values());
  }, [finalizedLeads]);

  // Filtered Finalized Leads
  const filteredFinalized = useMemo(() => {
    return finalizedLeads.filter((l) => {
      const s = finalizedSearch.toLowerCase();
      const name = (l.name || '').toLowerCase();
      const comp = (l.company || '').toLowerCase();
      const ph = (l.phone || '').toLowerCase();
      const city = (l.city || l.address || '').toLowerCase();
      const msg = (l.clearedInfo?.notes || l.clearedInfo?.message || l.clearedInfo?.purpose || '').toLowerCase();
      const emp = (l.clearedInfo?.clearedBy?.name || l.assignedTo?.name || '').toLowerCase();

      const matchesSearch = !s || name.includes(s) || comp.includes(s) || ph.includes(s) || city.includes(s) || msg.includes(s) || emp.includes(s);
      const matchesEmp = employeeFilter === 'ALL' || (l.clearedInfo?.clearedBy?.name === employeeFilter || l.assignedTo?.name === employeeFilter);

      return matchesSearch && matchesEmp;
    });
  }, [finalizedLeads, finalizedSearch, employeeFilter]);

  // Lookup corresponding finalized lead info for the selected deal
  const dealFinalizedInfo = useMemo(() => {
    if (!selectedDeal) return null;
    return finalizedLeads.find(
      (fl) =>
        fl.id === selectedDeal.leadId ||
        fl.leadId === selectedDeal.leadId ||
        fl.name?.toLowerCase() === selectedDeal.contactName?.toLowerCase() ||
        fl.company?.toLowerCase() === selectedDeal.company?.toLowerCase()
    );
  }, [selectedDeal, finalizedLeads]);

  return (
    <div className="space-y-fib-21">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-fib-13 pb-fib-8 border-b border-neutral-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            <span>Deals & Pipeline</span>
            <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              {finalizedLeads.length} Finalized Deals
            </span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            View completed deals, prospect details, contract values, and employee finalization notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingFinalized ? 'animate-spin' : ''}`} />}
            onClick={fetchFinalizedData}
          >
            Refresh
          </Button>

          <PermissionGate permission="deal.create">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsNewDealOpen(true)}
            >
              New Opportunity
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* KPI Tiles Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-fib-13">
        <WidgetBoundary name="kpi-finalized-count">
          <KPICard
            label="Total Finalized Leads"
            value={finalizedLeads.length}
            subtext="Closed Won by Employees"
            accent="green"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-won-revenue">
          <KPICard
            label="Total Won Revenue"
            value={`₹${totalWonValue.toLocaleString('en-IN')}`}
            subtext="Confirmed final value"
            accent="green"
            icon={<Award className="w-4 h-4 text-emerald-600" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-active-deals">
          <KPICard
            label="Active Deals in Pipeline"
            value={deals.length}
            subtext="In Progress"
            accent="blue"
            icon={<DollarSign className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-team-members">
          <KPICard
            label="Active Closers"
            value={uniqueEmployees.length || 1}
            subtext="Contributing Employees"
            accent="blue"
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </WidgetBoundary>
      </div>

      {/* Primary Tab View Switcher: Finalized Deals vs Kanban */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('FINALIZED')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs',
            activeTab === 'FINALIZED'
              ? 'bg-emerald-600 text-white shadow-emerald-200'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Finalized Deals & Messages</span>
          <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full font-black', activeTab === 'FINALIZED' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800')}>
            {finalizedLeads.length}
          </span>
        </button>

        {canViewDeals && <button
          type="button"
          onClick={() => setActiveTab('KANBAN')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs',
            activeTab === 'KANBAN'
              ? 'bg-blue-600 text-white shadow-blue-200'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
          )}
        >
          <Kanban className="w-4 h-4" />
          <span>Pipeline Kanban Stages</span>
          <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full font-black', activeTab === 'KANBAN' ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-800')}>
            {deals.length}
          </span>
        </button>}
      </div>

      {/* VIEW 1: FINALIZED LEADS (PRIMARY VIEW WITH FULL LEAD DETAILS & EMPLOYEE MESSAGE) */}
      {activeTab === 'FINALIZED' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={finalizedSearch}
                onChange={(e) => setFinalizedSearch(e.target.value)}
                placeholder="Search by prospect name, company, address/city, phone, or employee message..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-emerald-500 text-neutral-800"
              />
            </div>

            {uniqueEmployees.length > 0 && (
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Employees ({finalizedLeads.length})</option>
                {uniqueEmployees.map((emp) => (
                  <option key={emp} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Finalized Leads Compact Table */}
          {finalizedError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
              <p className="text-sm font-semibold text-rose-800">Completed leads could not be loaded.</p>
              <p className="mt-1 text-xs text-rose-700">{finalizedError}</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => void fetchFinalizedData()}>
                Retry
              </Button>
            </div>
          ) : isLoadingFinalized && finalizedLeads.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
              Loading completed leads from the database…
            </div>
          ) : filteredFinalized.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-neutral-500 shadow-2xs">
              <CheckCircle2 className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="font-bold text-neutral-800 text-sm">No Finalized Deals Found</p>
              <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                When an employee marks an assigned lead as Complete, it will be listed here with deal details and finalization message.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-700">
                  <thead className="bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase border-b border-neutral-200">
                    <tr>
                      <th className="py-3.5 px-4">Lead / Prospect & Company</th>
                      <th className="py-3.5 px-4">Address</th>
                      <th className="py-3.5 px-4">Phone / Contact</th>
                      <th className="py-3.5 px-4">Final Deal Value</th>
                      <th className="py-3.5 px-4">Finalized By</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredFinalized.map((lead) => {
                      const dealVal = lead.clearedInfo?.dealValue ?? lead.budget ?? 0;
                      const totalPaid = lead.clearedInfo?.paymentTotalPaid || 0;
                      const pendingAmount = Math.max(0, dealVal - totalPaid);
                      const isFullyPaid = pendingAmount === 0 && dealVal > 0;
                      const empName = lead.clearedInfo?.clearedBy?.name || lead.assignedTo?.name || 'Employee';
                      const addr = lead.address || lead.city || lead.leadAddress || '';

                      return (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedFinalizedLead(lead)}
                          className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900 group-hover:text-emerald-700 text-xs">
                                {lead.name || 'Unnamed Prospect'}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                WON
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-neutral-500 mt-0.5 font-medium">
                              <Building2 className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span>{lead.company || 'Individual Client'}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 max-w-[220px]">
                            {addr ? (
                              <div className="flex items-center gap-1 text-[11px] text-neutral-700 truncate" title={addr}>
                                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="truncate font-medium">{addr}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-neutral-400 italic">No address</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-0.5">
                              {lead.phone && (
                                <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-neutral-900">
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <span>{lead.phone}</span>
                                </div>
                              )}
                              {lead.email && (
                                <div className="text-[10px] text-neutral-500 font-mono truncate max-w-[140px]">
                                  {lead.email}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <span className="text-sm font-extrabold text-emerald-700 font-mono">
                                ₹{dealVal.toLocaleString('en-IN')}
                              </span>
                              <div className="space-y-0.5 text-[10px]">
                                <div className="text-neutral-500">
                                  Received: <span className="font-semibold text-neutral-700">₹{totalPaid.toLocaleString('en-IN')}</span>
                                </div>
                                <div className={cn('font-semibold', pendingAmount > 0 ? 'text-amber-700' : 'text-emerald-700')}>
                                  Pending: ₹{pendingAmount.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Avatar name={empName} size="xs" />
                              <div>
                                <span className="text-xs font-bold text-neutral-900 block">{empName}</span>
                                <span className="text-[10px] text-neutral-400 font-mono">
                                  {lead.clearedInfo?.clearedAt
                                    ? new Date(lead.clearedInfo.clearedAt).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                      })
                                    : '—'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end gap-2">
                              <div className="inline-flex items-center gap-2">
                                {canRecordPayment && (
                                  dealVal <= 0 ? (
                                    <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800">
                                      Set deal value
                                    </span>
                                  ) : isFullyPaid ? (
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800">
                                      <BadgeCheck className="h-3.5 w-3.5" />
                                      Done
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openPaymentDialog(lead);
                                      }}
                                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                                    >
                                      <BadgeCheck className="h-3.5 w-3.5" />
                                      {totalPaid > 0 ? 'Add Payment' : 'Done'}
                                    </button>
                                  )
                                )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFinalizedLead(lead);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                <span>View Details</span>
                              </button>
                              </div>
                              {paymentLead?.id === lead.id && (
                                <form
                                  onSubmit={(event) => {
                                    event.stopPropagation();
                                    void handleRecordLeadPayment(event);
                                  }}
                                  onClick={(event) => event.stopPropagation()}
                                  className="flex items-center justify-end gap-1.5"
                                >
                                  <label htmlFor={`payment-amount-${lead.id}`} className="sr-only">
                                    Amount received in INR
                                  </label>
                                  <input
                                    id={`payment-amount-${lead.id}`}
                                    autoFocus
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    max={pendingAmount}
                                    required
                                    value={paymentAmount}
                                    onChange={(event) => setPaymentAmount(event.target.value)}
                                    placeholder={`Up to ₹${pendingAmount.toLocaleString('en-IN')}`}
                                    aria-label={`Amount received in INR. Pending amount ₹${pendingAmount}`}
                                    className="w-36 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                  />
                                  <button
                                    type="submit"
                                    disabled={isRecordingPayment}
                                    className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isRecordingPayment ? 'Saving…' : 'Add amount'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isRecordingPayment}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setPaymentLead(null);
                                      setPaymentAmount('');
                                    }}
                                    className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Cancel
                                  </button>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: KANBAN PIPELINE VIEW */}
      {canViewDeals && activeTab === 'KANBAN' && (
        <WidgetBoundary name="pipeline-kanban-board">
          <div className="skeuo-raised-2 bg-white rounded-md border border-neutral-200 p-fib-13 space-y-3">
            {/* Quick Stage View Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-neutral-100">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-neutral-500 mr-1">Stage View:</span>
                <button
                  type="button"
                  onClick={() => setStageFilter('ALL')}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold transition-all',
                    stageFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  )}
                >
                  All Stages ({deals.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStageFilter('WON')}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1',
                    stageFilter === 'WON'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Closed Won ({deals.filter((d) => d.stage === 'WON').length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStageFilter('ACTIVE')}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold transition-all',
                    stageFilter === 'ACTIVE'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  )}
                >
                  In Progress ({deals.filter((d) => d.stage !== 'WON' && d.stage !== 'LOST').length})
                </button>
              </div>

              <div className="text-xs text-neutral-500">
                Total Won Revenue:{' '}
                <strong className="text-emerald-700 font-mono">
                  ₹{deals.filter((d) => d.stage === 'WON').reduce((sum, d) => sum + (d.value || 0), 0).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <KanbanBoard
              stages={visibleStages}
              deals={deals}
              onDealClick={(deal) => setSelectedDeal(deal)}
              onMoveDealStage={handleMoveStage}
              onDeleteDeal={(deal) => setDealToDelete(deal)}
            />
          </div>
        </WidgetBoundary>
      )}

      {/* Deal Detail Slide-Over Drawer */}
      <SlideOverPanel
        isOpen={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        title={selectedDeal?.title}
        subtitle={`${selectedDeal?.company} • Expected close ${selectedDeal?.expectedCloseDate}`}
        badge={
          selectedDeal && (
            <StatusPill
              label={selectedDeal.stage}
              variant={
                selectedDeal.stage === 'WON'
                  ? 'success'
                  : selectedDeal.stage === 'LOST'
                  ? 'danger'
                  : 'info'
              }
            />
          )
        }
      >
        {selectedDeal && (
          <div className="space-y-fib-21">
            {/* Value Hero Card */}
            <div className="skeuo-raised-2 bg-white rounded-md border border-neutral-200 p-fib-21 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                  Contract Value
                </span>
                <span className="text-3xl font-extrabold text-neutral-900 tabular-nums">
                  ₹{selectedDeal.value.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                  Win Probability
                </span>
                <span className="text-2xl font-bold text-green-700 tabular-nums">
                  {selectedDeal.probability}%
                </span>
              </div>
            </div>

            {/* Lead & Customer Details */}
            <div className="skeuo-raised-1 bg-white rounded-md border border-neutral-200 p-fib-13 space-y-fib-8 text-xs">
              <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
                Deal & Lead Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-700">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span className="truncate"><strong>Company:</strong> {selectedDeal.company}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span className="truncate"><strong>Contact:</strong> {selectedDeal.contactName}</span>
                </div>

                {/* Phone */}
                {(selectedDeal.contactPhone || dealFinalizedInfo?.phone) && (
                  <div className="flex items-center justify-between bg-neutral-50 px-2.5 py-1.5 rounded-lg border border-neutral-200 col-span-1 sm:col-span-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-mono font-bold text-neutral-900">
                        {selectedDeal.contactPhone || dealFinalizedInfo?.phone}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const num = selectedDeal.contactPhone || dealFinalizedInfo?.phone;
                        if (!num) return;
                        navigator.clipboard.writeText(num);
                        addToast({ type: 'info', title: 'Number Copied', message: `${num} copied to clipboard.` });
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                      title="Copy for mobile dial"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                )}

                {/* Address */}
                <div className="flex items-start gap-2 bg-neutral-50 px-2.5 py-1.5 rounded-lg border border-neutral-200 col-span-1 sm:col-span-2">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-500 block text-[10px] font-bold uppercase tracking-wider">Address:</span>
                    <span className="font-medium text-neutral-800 text-xs">
                      {selectedDeal.contactAddress || dealFinalizedInfo?.address || dealFinalizedInfo?.leadAddress || dealFinalizedInfo?.city || 'No address specified'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span><strong>Target Close:</strong> {selectedDeal.expectedCloseDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                  <span><strong>Health:</strong> {selectedDeal.health}</span>
                </div>
              </div>
            </div>

            {/* Employee Finalization Message Box */}
            {(selectedDeal.notes || selectedDeal.message || dealFinalizedInfo?.clearedInfo?.notes || dealFinalizedInfo?.notes || dealFinalizedInfo?.clearedInfo?.purpose) && (
              <div className="skeuo-raised-1 bg-gradient-to-br from-amber-50 to-orange-50/50 border-2 border-amber-300 rounded-xl p-fib-13 space-y-2">
                <div className="flex items-center gap-2 text-amber-950 font-extrabold text-xs">
                  <MessageSquare className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Employee Finalization Message:</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs">
                  <p className="text-xs text-neutral-900 font-medium whitespace-pre-wrap leading-relaxed">
                    {selectedDeal.notes || selectedDeal.message || dealFinalizedInfo?.clearedInfo?.notes || dealFinalizedInfo?.notes || dealFinalizedInfo?.clearedInfo?.purpose}
                  </p>
                </div>
                {(dealFinalizedInfo?.clearedInfo?.clearedBy?.name ||
                  dealFinalizedInfo?.clearedInfo?.clearedByName ||
                  dealFinalizedInfo?.assignedTo?.name) && (
                  <p className="text-[11px] text-amber-800 font-semibold text-right">
                    — Finalized by {
                      dealFinalizedInfo?.clearedInfo?.clearedBy?.name ||
                      dealFinalizedInfo?.clearedInfo?.clearedByName ||
                      dealFinalizedInfo?.assignedTo?.name
                    }
                  </p>
                )}
              </div>
            )}

            {/* Quick Stage Progression */}
            <div className="skeuo-raised-1 bg-white rounded-md border border-neutral-200 p-fib-13 space-y-fib-8">
              <h4 className="text-xs font-bold text-neutral-900">Change Pipeline Stage</h4>
              <div className="flex flex-wrap gap-fib-8">
                {stages.map((stg) => (
                  <Button
                    key={stg.id}
                    size="xs"
                    variant={selectedDeal.stage === stg.id ? 'primary' : 'secondary'}
                    onClick={() => {
                      handleMoveStage(selectedDeal.id, stg.id);
                      setSelectedDeal({ ...selectedDeal, stage: stg.id });
                    }}
                  >
                    {stg.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Delete Deal Option */}
            <div className="pt-fib-13 border-t border-neutral-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-neutral-800 block">Delete Opportunity</span>
                <span className="text-[11px] text-neutral-500">Permanently remove from sales pipeline</span>
              </div>
              <Button
                size="xs"
                variant="danger"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => setDealToDelete(selectedDeal)}
              >
                Delete Deal
              </Button>
            </div>
          </div>
        )}
      </SlideOverPanel>

      {/* New Opportunity Modal */}
      {isNewDealOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-fib-13">
          <div
            onClick={() => setIsNewDealOpen(false)}
            className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative w-full max-w-lg skeuo-raised-3 bg-white rounded-xl border border-neutral-200 p-fib-21 z-10 shadow-2xl space-y-fib-21">
            <div className="border-b border-neutral-100 pb-fib-8">
              <h3 className="text-base font-bold text-neutral-900">Create New Opportunity</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Register deal into the visual pipeline and assign revenue forecasts.
              </p>
            </div>

            <form onSubmit={handleCreateDeal} className="space-y-fib-13">
              <Input
                label="Opportunity Name *"
                placeholder="e.g. Enterprise License Expansion"
                value={newDealTitle}
                onChange={(e) => setNewDealTitle(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-fib-13">
                <Input
                  label="Company Name *"
                  placeholder="e.g. Global Tech Inc."
                  value={newDealCompany}
                  onChange={(e) => setNewDealCompany(e.target.value)}
                  required
                />
                <Input
                  label="Primary Contact"
                  placeholder="e.g. John Doe"
                  value={newDealContact}
                  onChange={(e) => setNewDealContact(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-fib-13 items-start">
                <Input
                  label="Deal Value ($)"
                  type="number"
                  value={newDealValue}
                  onChange={(e) => setNewDealValue(e.target.value)}
                />
                <Select
                  label="Initial Stage"
                  value={newDealStage}
                  onChange={(val) => setNewDealStage(val as DealStage)}
                  options={stages.map((s) => ({
                    value: s.id,
                    label: s.label,
                    description: `Column: ${s.label}`,
                  }))}
                />
              </div>

              <Input
                label="Target Close Date"
                type="date"
                value={newDealCloseDate}
                onChange={(e) => setNewDealCloseDate(e.target.value)}
              />

              <div className="pt-fib-13 border-t border-neutral-100 flex items-center justify-end gap-fib-8">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsNewDealOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isCreating}>
                  Create Opportunity
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Deal Confirmation Dialog */}
      {dealToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-fib-13">
          <div
            onClick={() => setDealToDelete(null)}
            className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative w-full max-w-md skeuo-raised-3 bg-white rounded-xl border border-neutral-200 p-fib-21 z-10 shadow-2xl space-y-fib-13">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-900">Delete Opportunity</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Are you sure you want to delete <strong className="text-neutral-900">{dealToDelete.title}</strong> ({dealToDelete.company})? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="pt-fib-8 border-t border-neutral-100 flex items-center justify-end gap-fib-8">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDealToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={isDeleting}
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={async () => {
                  await deleteDeal(dealToDelete.id);
                  if (selectedDeal?.id === dealToDelete.id) {
                    setSelectedDeal(null);
                  }
                  setDealToDelete(null);
                }}
              >
                Delete Opportunity
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Finalized Lead Full Details Modal (Opens on Click) */}
      {selectedFinalizedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedFinalizedLead(null)}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative w-full max-w-xl bg-white rounded-2xl border border-neutral-200 p-6 z-10 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-neutral-900">
                      {selectedFinalizedLead.name || 'Unnamed Prospect'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-200">
                      Closed Won
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3 text-neutral-400" />
                    <span>{selectedFinalizedLead.company || 'Individual Client'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFinalizedLead(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Final Deal Value Highlight Card */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Final Closed Contract Value
                </span>
                <span className="text-2xl font-black text-emerald-800 font-mono">
                  ₹{(selectedFinalizedLead.clearedInfo?.dealValue || selectedFinalizedLead.budget || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Status
                </span>
                <span className="text-xs font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-md border border-emerald-200 inline-block mt-0.5">
                  100% Closed Won
                </span>
              </div>
            </div>
            {(() => {
              const total = selectedFinalizedLead.clearedInfo?.dealValue ?? selectedFinalizedLead.budget ?? 0;
              const paid = selectedFinalizedLead.clearedInfo?.paymentTotalPaid || 0;
              const pending = Math.max(0, total - paid);
              return (
                <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-blue-900">Payment Summary</h4>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="block text-neutral-500">Total Amount</span>
                      <strong className="mt-1 block font-mono text-neutral-900">₹{total.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="block text-neutral-500">Received</span>
                      <strong className="mt-1 block font-mono text-emerald-700">₹{paid.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="block text-neutral-500">Pending</span>
                      <strong className={cn('mt-1 block font-mono', pending > 0 ? 'text-amber-700' : 'text-emerald-700')}>
                        ₹{pending.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                  <p className={cn('mt-3 text-[11px] font-semibold', pending > 0 ? 'text-amber-800' : 'text-emerald-800')}>
                    {pending > 0 ? 'Payment pending' : 'Full payment received'}
                  </p>
                </section>
              );
            })()}

            {/* Customer & Address Details */}
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 space-y-3 text-xs">
              <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Customer Details & Address</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Phone with copy */}
                <div className="p-2.5 bg-white rounded-lg border border-neutral-200">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block">Phone</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-bold font-mono text-neutral-900 text-sm">
                      {selectedFinalizedLead.phone || '—'}
                    </span>
                    {selectedFinalizedLead.phone && (
                      <button
                        type="button"
                        onClick={() => {
                          const phone = selectedFinalizedLead.phone;
                          if (!phone) return;
                          navigator.clipboard.writeText(phone);
                          addToast({
                            type: 'info',
                            title: 'Phone Copied',
                            message: `${phone} copied to clipboard for mobile dialing.`,
                          });
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                        title="Copy to dial from your phone"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="p-2.5 bg-white rounded-lg border border-neutral-200">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block">Email</span>
                  <span className="font-mono text-neutral-800 text-xs block mt-1 truncate">
                    {selectedFinalizedLead.email || 'No email provided'}
                  </span>
                </div>

                {/* Full Address Card */}
                <div className="col-span-1 sm:col-span-2 p-3 bg-white rounded-lg border border-neutral-200">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>Customer Address:</span>
                  </span>
                  <p className="font-semibold text-neutral-900 text-xs mt-1 leading-relaxed">
                    {selectedFinalizedLead.address ||
                      selectedFinalizedLead.city ||
                      selectedFinalizedLead.leadAddress ||
                      (selectedFinalizedLead.customFields?.['Address'] as string) ||
                      (selectedFinalizedLead.customFields?.['address'] as string) ||
                      'No address specified'}
                  </p>
                </div>
              </div>
            </div>

            {/* Employee Finalization Message Box (Crucial user requirement) */}
            <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-amber-950 font-extrabold text-xs uppercase tracking-wider">
                <MessageSquare className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Employee Finalization Message:</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-amber-200">
                <p className="text-xs font-semibold text-neutral-900 leading-relaxed whitespace-pre-wrap">
                  {selectedFinalizedLead.clearedInfo?.notes ||
                    selectedFinalizedLead.clearedInfo?.message ||
                    selectedFinalizedLead.clearedInfo?.purpose ||
                    selectedFinalizedLead.notes ||
                    'Lead marked WON by employee.'}
                </p>
              </div>
              <div className="flex items-center justify-between text-[11px] text-amber-800 font-semibold pt-1">
                <span>
                  Finalized by: {
                    selectedFinalizedLead.clearedInfo?.clearedBy?.name ||
                    selectedFinalizedLead.clearedInfo?.clearedByName ||
                    selectedFinalizedLead.assignedTo?.name ||
                    'Employee'
                  }
                </span>
                <span className="font-mono">
                  {selectedFinalizedLead.clearedInfo?.clearedAt ? new Date(selectedFinalizedLead.clearedInfo.clearedAt).toLocaleString('en-IN') : '—'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedFinalizedLead(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
