import { useState, useEffect, useCallback } from 'react';
import {
  reportApi,
  WorkReportItem,
  WorkReportsResponse,
} from './api/reportApi';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/stores/uiStore';
import {
  FileText,
  Search,
  Calendar,
  RefreshCw,
  User,
  Code2,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
} from 'lucide-react';

function resolveSelfieUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('data:image')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/api/')) {
    const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '';
    if (apiBase && typeof apiBase === 'string' && (apiBase.startsWith('http://') || apiBase.startsWith('https://'))) {
      try {
        const origin = new URL(apiBase).origin;
        return `${origin}${url}`;
      } catch {}
    }
  }
  return url;
}

export function WorkReportsTableView() {
  const [data, setData] = useState<WorkReportsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Modals
  const [selectedReport, setSelectedReport] = useState<WorkReportItem | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  // Review modal state
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REVIEWED' | 'REJECTED'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);

  const { addToast } = useUIStore();

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await reportApi.getWorkReports({
        search: search.trim() || undefined,
        date: selectedDate || undefined,
        workCategory: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        page,
        limit: pageSize,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch work reports from database');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedDate, selectedCategory, selectedStatus, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchReports();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchReports]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await reportApi.syncWorkReports();
      addToast({
        type: 'success',
        title: 'Sync Complete',
        message: `Successfully synchronized ${res?.syncedCount || 0} work reports into reports collection.`,
      });
      await fetchReports();
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Sync Failed',
        message: err?.message || 'Could not synchronize reports',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveReview = async () => {
    if (!selectedReport) return;
    setIsSavingReview(true);
    try {
      const updated = await reportApi.reviewWorkReport(selectedReport._id, {
        status: reviewStatus,
        reviewNotes: reviewNotes.trim() || undefined,
      });
      addToast({
        type: 'success',
        title: 'Review Saved',
        message: `Report marked as ${reviewStatus}.`,
      });
      setSelectedReport(updated);
      setIsReviewing(false);
      await fetchReports();
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Review Error',
        message: err?.message || 'Failed to save review',
      });
    } finally {
      setIsSavingReview(false);
    }
  };

  const reportsList = data?.reports || [];
  const summary = data?.summary;

  return (
    <div className="space-y-5">
      {/* Top Banner / Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Reports */}
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-indigo-100/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Total Reports (कुल रिपोर्ट)</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900">
              Database 'reports'
            </span>
          </div>
          <div className="mt-2 text-3xl font-black text-indigo-950 font-mono">
            {summary?.totalReports ?? reportsList.length}
          </div>
          <p className="mt-1 text-xs text-indigo-700">All submitted employee punch-out reports</p>
        </div>

        {/* Today's Reports */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-emerald-100/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Today's Reports (आज की रिपोर्ट)</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
              Live Today
            </span>
          </div>
          <div className="mt-2 text-3xl font-black text-emerald-950 font-mono">
            {summary?.todayReports ?? 0}
          </div>
          <p className="mt-1 text-xs text-emerald-700">Submissions received today</p>
        </div>

        {/* Active Employees */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-blue-100/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              <span>Active Reporters (कर्मचारी)</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
              Distinct Staff
            </span>
          </div>
          <div className="mt-2 text-3xl font-black text-blue-950 font-mono">
            {summary?.uniqueEmployees ?? 0}
          </div>
          <p className="mt-1 text-xs text-blue-700">Employees who submitted work logs</p>
        </div>

        {/* Categories Breakdown */}
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/80 to-purple-100/30 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Work Categories</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
              {summary?.categories?.length ?? 0} Types
            </span>
          </div>
          <div className="mt-2 text-sm font-bold text-purple-950 truncate">
            {summary?.categories?.[0]?.category || 'General Work'}
          </div>
          <p className="mt-1 text-xs text-purple-700 truncate">
            Top: {summary?.categories?.[0]?.count ?? 0} entries
          </p>
        </div>
      </div>

      {/* Filter and Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search employee, task, changes…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-neutral-300 bg-neutral-50/50 py-1.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-500 focus:bg-white transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:border-indigo-500 cursor-pointer"
              title="Filter by specific date"
            />
            {selectedDate && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setSelectedDate('')}
                className="text-[11px] text-neutral-500 hover:text-neutral-700 px-1.5"
              >
                Clear Date
              </Button>
            )}
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="Development & Code Changes">Development & Code Changes</option>
            <option value="Sales & Calling">Sales & Calling</option>
            <option value="Client Meetings">Client Meetings</option>
            <option value="Support & Operations">Support & Operations</option>
            <option value="General Work">General Work</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REVIEWED">Reviewed</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="text-xs font-bold border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
            title="Sync all punchout reports from MongoDB attendances into reports collection"
          >
            {isSyncing ? 'Syncing DB…' : 'Sync from Attendance'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchReports()}
            disabled={isLoading}
            className="text-xs"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Reports Table / List */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="py-24 text-center">
            <RefreshCw className="mx-auto mb-2 h-7 w-7 animate-spin text-indigo-600" />
            <p className="text-xs font-semibold text-neutral-500">
              Fetching submitted work reports from 'reports' collection…
            </p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-xs text-rose-600 bg-rose-50/50">
            <p className="font-bold">Error loading reports:</p>
            <p>{error}</p>
            <Button size="xs" variant="secondary" onClick={() => void fetchReports()} className="mt-3">
              Try Again
            </Button>
          </div>
        ) : reportsList.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <FileText className="mx-auto h-10 w-10 text-neutral-300" />
            <p className="text-sm font-bold text-neutral-700">No Work Reports Found</p>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              No reports match your current filters. Employees will appear here automatically when they submit a daily report during Punch-Out.
            </p>
            <Button size="sm" variant="secondary" onClick={handleSync} className="mt-2">
              Sync Existing Reports from Database
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50/80 text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 min-w-[280px]">Work Summary & Tasks</th>
                  <th className="px-4 py-3">Code / Changes</th>
                  <th className="px-4 py-3">Departure Selfie</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {reportsList.map((item) => {
                  const categoryBadgeColor =
                    item.workCategory === 'Development & Code Changes'
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : item.workCategory === 'Sales & Calling'
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : item.workCategory === 'Client Meetings'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200';

                  const statusBadge =
                    item.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : item.status === 'REVIEWED'
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : item.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-amber-100 text-amber-900 border-amber-200';

                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-neutral-50/60 transition cursor-pointer"
                      onClick={() => setSelectedReport(item)}
                    >
                      {/* Employee Info */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-neutral-900">{item.userName}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-mono mt-0.5">
                          <span className="font-semibold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-100">
                            {item.employeeId || 'EMP'}
                          </span>
                          <span>·</span>
                          <span className="truncate max-w-[120px]">{item.department}</span>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-neutral-900">{item.date}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          {item.submittedAt ? new Date(item.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${categoryBadgeColor}`}>
                          {item.workCategory || 'General Work'}
                        </span>
                      </td>

                      {/* Work Report Summary */}
                      <td className="px-4 py-3.5">
                        <p className="line-clamp-2 text-neutral-800 leading-relaxed font-medium">
                          {item.workReport || '-'}
                        </p>
                      </td>

                      {/* Code / Development Changes */}
                      <td className="px-4 py-3.5">
                        {item.developmentChanges ? (
                          <div className="max-w-[200px] truncate rounded bg-neutral-900 px-2 py-1 font-mono text-[10px] text-amber-300">
                            {item.developmentChanges}
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Departure Photo Preview */}
                      <td className="px-4 py-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {item.punchOutImageUrl ? (
                          <img
                            src={resolveSelfieUrl(item.punchOutImageUrl)}
                            alt="Punchout Selfie"
                            className="h-10 w-10 rounded-lg object-cover border border-rose-300 shadow-2xs hover:scale-105 transition cursor-pointer"
                            onClick={() =>
                              setPreviewImage({
                                url: resolveSelfieUrl(item.punchOutImageUrl),
                                title: `${item.userName} - Departure Selfie`,
                                subtitle: `${item.date} · Location: ${item.logoutLocation?.address || item.logoutLocation || 'Office'}`,
                              })
                            }
                            title="Click to zoom selfie"
                          />
                        ) : item.selfieUrl ? (
                          <img
                            src={resolveSelfieUrl(item.selfieUrl)}
                            alt="Checkin Selfie"
                            className="h-10 w-10 rounded-lg object-cover border border-emerald-300 shadow-2xs hover:scale-105 transition cursor-pointer"
                            onClick={() =>
                              setPreviewImage({
                                url: resolveSelfieUrl(item.selfieUrl),
                                title: `${item.userName} - Check-in Selfie`,
                                subtitle: `${item.date} · Location: ${item.location?.address || item.location || 'Office'}`,
                              })
                            }
                            title="Click to zoom checkin selfie"
                          />
                        ) : (
                          <span className="text-[10px] text-neutral-400">System Log</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                          {item.status || 'SUBMITTED'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => setSelectedReport(item)}
                            className="text-[11px] font-bold"
                          >
                            View
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => {
                              setSelectedReport(item);
                              setIsReviewing(true);
                              setReviewStatus(item.status === 'APPROVED' ? 'APPROVED' : 'REVIEWED');
                              setReviewNotes(item.reviewNotes || '');
                            }}
                            className="text-[11px] text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50"
                          >
                            Review
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50/70 px-4 py-3 text-xs">
            <span className="text-neutral-500">
              Showing page <strong className="text-neutral-900">{data.page}</strong> of{' '}
              <strong className="text-neutral-900">{data.totalPages}</strong> ({data.total} total reports)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="xs"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                icon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <Button
                size="xs"
                variant="secondary"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                icon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Details & Inspection Modal */}
      {selectedReport && !isReviewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-neutral-900">
                    {selectedReport.userName}'s Work Report
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                    {selectedReport.employeeId}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Date: <span className="font-mono font-bold text-neutral-800">{selectedReport.date}</span> · Department: {selectedReport.department}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category & Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-600">Category:</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                  {selectedReport.workCategory}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-600">Status:</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                  {selectedReport.status}
                </span>
              </div>
            </div>

            {/* Work Report Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
                Work Summary & Tasks Completed (कार्य विवरण)
              </label>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed font-medium">
                {selectedReport.workReport}
              </div>
            </div>

            {/* Development / Code Changes */}
            {selectedReport.developmentChanges && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Specific Code Changes / Modules Updated</span>
                </label>
                <div className="rounded-xl bg-neutral-900 p-4 font-mono text-xs text-neutral-100 whitespace-pre-wrap leading-relaxed">
                  {selectedReport.developmentChanges}
                </div>
              </div>
            )}

            {/* Photos & Timings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Checkin Info */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 flex items-center gap-3">
                {selectedReport.selfieUrl ? (
                  <img
                    src={resolveSelfieUrl(selectedReport.selfieUrl)}
                    alt="Checkin"
                    className="h-14 w-14 rounded-lg object-cover border border-emerald-400 cursor-pointer"
                    onClick={() =>
                      setPreviewImage({
                        url: resolveSelfieUrl(selectedReport.selfieUrl),
                        title: `${selectedReport.userName} - Check-in Selfie`,
                      })
                    }
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 text-[10px] font-bold">
                    No Photo
                  </div>
                )}
                <div className="text-xs min-w-0">
                  <div className="font-bold text-emerald-950">Punch-In (Arrival)</div>
                  <div className="font-mono text-neutral-600 mt-0.5">
                    {selectedReport.punchInTime ? new Date(selectedReport.punchInTime).toLocaleTimeString('en-IN') : '-'}
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate">
                    {selectedReport.location?.address || selectedReport.location || 'Office'}
                  </div>
                </div>
              </div>

              {/* Punchout Info */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 flex items-center gap-3">
                {selectedReport.punchOutImageUrl ? (
                  <img
                    src={resolveSelfieUrl(selectedReport.punchOutImageUrl)}
                    alt="Punchout"
                    className="h-14 w-14 rounded-lg object-cover border border-rose-400 cursor-pointer"
                    onClick={() =>
                      setPreviewImage({
                        url: resolveSelfieUrl(selectedReport.punchOutImageUrl),
                        title: `${selectedReport.userName} - Departure Selfie`,
                      })
                    }
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-rose-100 flex items-center justify-center text-rose-800 text-[10px] font-bold">
                    No Photo
                  </div>
                )}
                <div className="text-xs min-w-0">
                  <div className="font-bold text-rose-950">Punch-Out (Departure)</div>
                  <div className="font-mono text-neutral-600 mt-0.5">
                    {selectedReport.punchOutTime ? new Date(selectedReport.punchOutTime).toLocaleTimeString('en-IN') : '-'}
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate">
                    {selectedReport.logoutLocation?.address || selectedReport.logoutLocation || 'Office'}
                  </div>
                </div>
              </div>
            </div>

            {/* Review Notes (if already reviewed) */}
            {selectedReport.reviewNotes && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs space-y-1">
                <div className="font-bold text-blue-900">Admin Feedback / Review Notes:</div>
                <div className="text-neutral-700">{selectedReport.reviewNotes}</div>
                {selectedReport.reviewedBy && (
                  <div className="text-[10px] text-neutral-400">
                    Reviewed by {selectedReport.reviewedBy} on {selectedReport.reviewedAt ? new Date(selectedReport.reviewedAt).toLocaleDateString('en-IN') : ''}
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsReviewing(true);
                  setReviewStatus(selectedReport.status === 'APPROVED' ? 'APPROVED' : 'REVIEWED');
                  setReviewNotes(selectedReport.reviewNotes || '');
                }}
                className="font-bold text-indigo-700 border-indigo-200 bg-indigo-50"
              >
                Review / Approve Report
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setSelectedReport(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal Form */}
      {selectedReport && isReviewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in"
          onClick={() => !isSavingReview && setIsReviewing(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">
                  Review Report: {selectedReport.userName}
                </h3>
                <p className="text-xs text-neutral-500 font-mono">{selectedReport.date}</p>
              </div>
              <button
                onClick={() => setIsReviewing(false)}
                className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Status Decision
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-neutral-300 p-2 text-xs font-medium outline-none focus:border-indigo-500"
                >
                  <option value="APPROVED">APPROVED (स्वीकृत)</option>
                  <option value="REVIEWED">REVIEWED (देखा गया)</option>
                  <option value="REJECTED">REJECTED (अस्वीकृत / दोबारा भेजो)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Feedback / Notes for Employee
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Good progress on feature module. Please document APIs."
                  className="w-full rounded-xl border border-neutral-300 p-2.5 text-xs outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReviewing(false)}
                disabled={isSavingReview}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveReview}
                disabled={isSavingReview}
                className="font-bold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {isSavingReview ? 'Saving…' : 'Save Review'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Photo Zoom Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-lg w-full rounded-2xl bg-white p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div>
                <h4 className="text-sm font-bold text-neutral-900">{previewImage.title}</h4>
                {previewImage.subtitle && (
                  <p className="text-xs text-neutral-500">{previewImage.subtitle}</p>
                )}
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-hidden rounded-xl bg-neutral-900 flex items-center justify-center">
              <img
                src={previewImage.url}
                alt="Enlarged Selfie"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
