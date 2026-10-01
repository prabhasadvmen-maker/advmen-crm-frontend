import { useState, useEffect, useMemo } from 'react';
import { LeadQuery } from '@/types';
import { KPICard } from '@/components/patterns/KPICard';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { useSessionStore } from '@/stores/sessionStore';
import { useUIStore } from '@/stores/uiStore';
import { leadApi } from '@/features/leads/api/leadApi';
import {
  HelpCircle,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  Search,
  X,
  Check,
  Copy,
  MapPin,
  Eye,
  Building2,
  AlertTriangle,
  Clock,
  Phone,
} from 'lucide-react';

export function CallsPage() {
  const { user } = useSessionStore();
  const { addToast } = useUIStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN';

  // Employee Queries State
  const [queries, setQueries] = useState<LeadQuery[]>([]);
  const [isLoadingQueries, setIsLoadingQueries] = useState(false);
  const [querySearch, setQuerySearch] = useState('');
  const [queryPriorityFilter, setQueryPriorityFilter] = useState<'ALL' | 'URGENT' | 'HIGH' | 'NORMAL'>('ALL');
  const [queryStatusFilter, setQueryStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [selectedQueryForReply, setSelectedQueryForReply] = useState<LeadQuery | null>(null);
  const [detailModalQuery, setDetailModalQuery] = useState<LeadQuery | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const fetchQueries = async () => {
    setIsLoadingQueries(true);
    try {
      const data = await leadApi.getAllQueries();
      setQueries(data || []);
    } catch {
      // non-fatal
    } finally {
      setIsLoadingQueries(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  const handleCopyPhone = (phone?: string, leadName?: string) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    addToast({
      type: 'info',
      title: 'Phone Number Copied',
      message: `${phone} ${leadName ? `(${leadName})` : ''} copied to clipboard. Dial from your mobile phone.`,
    });
  };

  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      const s = querySearch.toLowerCase();
      const matchesSearch =
        !s ||
        (q.leadName || '').toLowerCase().includes(s) ||
        (q.leadCompany || '').toLowerCase().includes(s) ||
        (q.leadPhone || '').includes(s) ||
        (q.text || '').toLowerCase().includes(s) ||
        (q.leadAddress || '').toLowerCase().includes(s) ||
        (q.leadCity || '').toLowerCase().includes(s) ||
        (q.raisedBy?.name || '').toLowerCase().includes(s);

      const matchesPri = queryPriorityFilter === 'ALL' || q.priority === queryPriorityFilter;
      const matchesStatus = queryStatusFilter === 'ALL' || q.status === queryStatusFilter;

      return matchesSearch && matchesPri && matchesStatus;
    });
  }, [queries, querySearch, queryPriorityFilter, queryStatusFilter]);

  const openCount = queries.filter((q) => q.status === 'OPEN').length;
  const resolvedCount = queries.filter((q) => q.status === 'RESOLVED').length;
  const urgentCount = queries.filter((q) => q.priority === 'URGENT').length;

  return (
    <div className="space-y-fib-21">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-fib-13 pb-fib-8 border-b border-neutral-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-amber-500" />
            Lead Queries & Escalations
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Only leads with employee submitted queries, contact details, and messages are displayed here.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingQueries ? 'animate-spin' : ''}`} />}
          onClick={fetchQueries}
        >
          Refresh Queries
        </Button>
      </div>

      {/* KPI Tiles (Strictly for Queries) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-fib-13">
        <WidgetBoundary name="kpi-total-queries">
          <KPICard
            label="Total Queries"
            value={queries.length}
            subtext="All query submissions"
            accent="blue"
            icon={<HelpCircle className="w-4 h-4 text-blue-600" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-open-queries">
          <KPICard
            label="Pending Queries"
            value={openCount}
            subtext="Awaiting admin action"
            accent="amber"
            icon={<Clock className="w-4 h-4 text-amber-600" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-resolved-queries">
          <KPICard
            label="Resolved Queries"
            value={resolvedCount}
            subtext="Successfully answered"
            accent="green"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-urgent-queries">
          <KPICard
            label="Urgent Escalations"
            value={urgentCount}
            subtext="High priority queries"
            accent="rose"
            icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
          />
        </WidgetBoundary>
      </div>

      {/* Main Queries Container */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={querySearch}
              onChange={(e) => setQuerySearch(e.target.value)}
              placeholder="Search queries by prospect, company, phone, address, employee, or message..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={queryStatusFilter}
            onChange={(e) => setQueryStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 bg-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Status ({queries.length})</option>
            <option value="OPEN">Open / Pending Only ({openCount})</option>
            <option value="RESOLVED">Resolved Only ({resolvedCount})</option>
          </select>

          <select
            value={queryPriorityFilter}
            onChange={(e) => setQueryPriorityFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 bg-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent Priority ({urgentCount})</option>
            <option value="HIGH">High Priority</option>
            <option value="NORMAL">Normal Priority</option>
          </select>
        </div>

        {/* Queries Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-700">
            <thead className="bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase border-y border-neutral-200">
              <tr>
                <th className="py-3 px-4">Prospect, Company & Address</th>
                <th className="py-3 px-4">Phone (Click to Copy)</th>
                <th className="py-3 px-4">Raised By (Employee)</th>
                <th className="py-3 px-4 min-w-[280px]">Employee Query Message</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredQueries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    <HelpCircle className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                    <p className="font-bold text-neutral-800 text-sm">No Lead Queries Found</p>
                    <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                      When an employee submits a query on an assigned lead, it will be listed here along with full lead details and employee message.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQueries.map((q) => (
                  <tr key={q.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3.5 px-4 max-w-[240px]">
                      <p className="font-bold text-neutral-900 text-xs">{q.leadName || 'Unnamed Prospect'}</p>
                      <p className="text-[11px] text-neutral-600 flex items-center gap-1 mt-0.5 truncate font-medium">
                        <Building2 className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">{q.leadCompany || 'Individual Client'}</span>
                      </p>
                      {(q.leadAddress || q.leadCity) ? (
                        <p className="text-[10px] text-amber-800 flex items-center gap-1 mt-0.5 truncate font-medium" title={q.leadAddress || q.leadCity}>
                          <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="truncate">{q.leadAddress || q.leadCity}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-neutral-400 italic flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-neutral-300 shrink-0" />
                          <span>No address</span>
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {q.leadPhone ? (
                        <div className="flex items-center gap-1.5 bg-neutral-50 px-2 py-1 rounded border border-neutral-200 w-fit">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span className="font-mono font-bold text-neutral-900">{q.leadPhone}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(q.leadPhone, q.leadName)}
                            className="p-1 hover:bg-neutral-200 rounded text-neutral-500 hover:text-neutral-900 transition-colors ml-1"
                            title="Copy number to dial from your mobile phone"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">No phone</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Avatar name={q.raisedBy?.name || 'Employee'} size="xs" />
                        <div>
                          <p className="font-bold text-neutral-900 text-xs">{q.raisedBy?.name || 'Employee'}</p>
                          <p className="text-[10px] text-neutral-400 font-mono">
                            {q.createdAt ? new Date(q.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {/* Prominent Employee Message Box */}
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
                        <div className="flex items-center gap-1 text-amber-900 font-bold text-[10px] uppercase tracking-wider">
                          <MessageSquare className="w-3 h-3 text-amber-600" />
                          <span>Employee Message:</span>
                        </div>
                        <p className="text-xs font-semibold text-neutral-900 leading-snug">
                          {q.text}
                        </p>
                      </div>

                      {/* Admin Reply if Resolved */}
                      {q.reply && (
                        <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-950 font-medium flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-[10px] text-emerald-800">Admin Response:</span>
                            <span>{q.reply}</span>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          q.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : q.priority === 'HIGH'
                            ? 'bg-orange-100 text-orange-800 border border-orange-200'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {q.priority}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {q.status === 'OPEN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-700" />
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          Resolved
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailModalQuery(q)}
                          className="px-2 py-1 rounded text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors flex items-center gap-1"
                          title="View Full Lead & Query Details"
                        >
                          <Eye className="w-3 h-3 text-neutral-500" />
                          <span>View Details</span>
                        </button>

                        {isAdmin && q.status === 'OPEN' && (
                          <Button
                            size="xs"
                            variant="primary"
                            icon={<Check className="w-3 h-3" />}
                            onClick={() => {
                              setSelectedQueryForReply(q);
                              setAdminReply('');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Resolve / Reply
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Reply & Resolve Query Modal */}
      {selectedQueryForReply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedQueryForReply(null)}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-neutral-200 p-6 z-10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Resolve Employee Query
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Lead: {selectedQueryForReply.leadName} • Employee: {selectedQueryForReply.raisedBy?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedQueryForReply(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Query Message Box */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-neutral-800">
              <span className="font-bold text-amber-900 block mb-1">Employee Query:</span>
              <p className="leading-relaxed font-semibold">{selectedQueryForReply.text}</p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedQueryForReply.leadId) return;
                setIsSubmittingReply(true);
                try {
                  await leadApi.resolveQuery(selectedQueryForReply.leadId, selectedQueryForReply.id, adminReply.trim() || undefined);
                  addToast({
                    type: 'success',
                    title: 'Query Resolved',
                    message: `Query for ${selectedQueryForReply.leadName} has been resolved.`,
                  });
                  setSelectedQueryForReply(null);
                  setAdminReply('');
                  fetchQueries();
                } catch (err: any) {
                  addToast({
                    type: 'danger',
                    title: 'Failed to resolve query',
                    message: err.message || 'Something went wrong.',
                  });
                } finally {
                  setIsSubmittingReply(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Admin Resolution Reply / Solution
                </label>
                <textarea
                  rows={3}
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  placeholder="e.g. Approved 15% discount / Phone number verified and updated / Called customer and scheduled demo..."
                  className="w-full p-3 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-emerald-500 text-neutral-800"
                />
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedQueryForReply(null)}
                  disabled={isSubmittingReply}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmittingReply}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Mark as Resolved
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Lead Query Detail Modal */}
      {detailModalQuery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setDetailModalQuery(null)}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative w-full max-w-xl bg-white rounded-2xl border border-neutral-200 p-6 z-10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Lead & Query Details
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Lead Code: <span className="font-mono font-bold text-neutral-700">{detailModalQuery.leadCode || detailModalQuery.leadId}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalQuery(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lead Primary Characteristics */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">Prospect Name</span>
                <p className="font-bold text-neutral-900 text-sm">{detailModalQuery.leadName || 'Unnamed Prospect'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">Company</span>
                <p className="font-semibold text-neutral-800 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                  {detailModalQuery.leadCompany || 'No Company'}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">Phone (Click to Copy)</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold font-mono text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200">
                    {detailModalQuery.leadPhone || '—'}
                  </span>
                  {detailModalQuery.leadPhone && (
                    <button
                      type="button"
                      onClick={() => handleCopyPhone(detailModalQuery.leadPhone, detailModalQuery.leadName)}
                      className="p-1 hover:bg-neutral-200 rounded text-neutral-600 transition-colors"
                      title="Copy number to dial from your phone"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">Email</span>
                <p className="font-mono text-neutral-700 truncate">{detailModalQuery.leadEmail || '—'}</p>
              </div>
              {(detailModalQuery.leadAddress || detailModalQuery.leadCity) && (
                <div className="col-span-2 pt-1 border-t border-neutral-200">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">Address / City</span>
                  <p className="font-medium text-neutral-800 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{detailModalQuery.leadAddress || detailModalQuery.leadCity}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Raised By Employee Box */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={detailModalQuery.raisedBy?.name || 'Employee'} size="sm" />
                <div>
                  <span className="text-[10px] text-blue-700 font-bold uppercase block">Query Raised By</span>
                  <p className="font-bold text-neutral-900">{detailModalQuery.raisedBy?.name || 'Employee'}</p>
                  <p className="text-[10px] text-neutral-500">{detailModalQuery.raisedBy?.email}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 block font-bold uppercase">Time</span>
                <span className="text-[11px] font-mono text-neutral-700">
                  {detailModalQuery.createdAt ? new Date(detailModalQuery.createdAt).toLocaleString('en-IN') : '—'}
                </span>
              </div>
            </div>

            {/* Employee Message Highlight Card */}
            <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-xs space-y-1.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span>Employee Message:</span>
              </div>
              <p className="text-neutral-900 font-semibold text-sm leading-relaxed bg-white p-3 rounded-lg border border-amber-200">
                {detailModalQuery.text}
              </p>
            </div>

            {/* Admin Reply or Resolution Info */}
            {detailModalQuery.reply ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Admin Resolution Reply:
                </span>
                <p className="text-emerald-950 font-medium text-xs leading-relaxed bg-white p-2.5 rounded-lg border border-emerald-200">
                  {detailModalQuery.reply}
                </p>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-neutral-100 text-neutral-500 text-xs flex items-center justify-between">
                <span>No admin resolution reply submitted yet.</span>
                {isAdmin && (
                  <Button
                    size="xs"
                    variant="primary"
                    icon={<Check className="w-3 h-3" />}
                    onClick={() => {
                      const target = detailModalQuery;
                      setDetailModalQuery(null);
                      setSelectedQueryForReply(target);
                      setAdminReply('');
                    }}
                  >
                    Answer / Resolve Now
                  </Button>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-neutral-100 flex items-center justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDetailModalQuery(null)}
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
