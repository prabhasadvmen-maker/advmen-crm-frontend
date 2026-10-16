import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  attendanceApi,
  EmployeeMonthlyHistoryResponse,
  EmployeeMonthDayHistory,
  EmployeeDailyReportResponse,
} from './api/attendanceApi';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/stores/uiStore';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  Utensils,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Users,
  LogIn,
  LogOut,
  Plus,
  X,
  RefreshCw,
  Grid,
  List,
  FileText,
  Phone,
  Briefcase,
  Printer,
  Sparkles,
  ArrowUpDown,
  Zap,
} from 'lucide-react';

interface EmployeeOption {
  userId: string;
  name: string;
  email: string;
  employeeId?: string;
  department?: string;
  role?: string;
  avatarUrl?: string;
  latestSelfie?: string;
}

interface EmployeeMonthlyHistoryViewProps {
  availableEmployees: EmployeeOption[];
  preselectedUserId?: string;
  onPreviewSelfie?: (selfie: { url: string; name: string; time: string; location?: string }) => void;
}

function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

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

export function EmployeeMonthlyHistoryView({
  availableEmployees,
  preselectedUserId,
  onPreviewSelfie,
}: EmployeeMonthlyHistoryViewProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(
    preselectedUserId || (availableEmployees.length > 0 ? availableEmployees[0].userId : '')
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [historyData, setHistoryData] = useState<EmployeeMonthlyHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [selectedDayDetails, setSelectedDayDetails] = useState<EmployeeMonthDayHistory | null>(null);

  // Pagination & Sorting State: 'today-first' puts Today at the top of Front Page!
  const [sortOrder, setSortOrder] = useState<'today-first' | 'asc'>('today-first');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Daily Activity Report Modal State
  const [isDailyReportModalOpen, setIsDailyReportModalOpen] = useState(false);
  const [dailyReportData, setDailyReportData] = useState<EmployeeDailyReportResponse | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [selectedReportDate, setSelectedReportDate] = useState<string>('');

  // Manual lunch modal state
  const [isManualLunchModalOpen, setIsManualLunchModalOpen] = useState(false);
  const [manualLunchDate, setManualLunchDate] = useState('');
  const [manualLunchStart, setManualLunchStart] = useState('01:15 PM');
  const [manualLunchEnd, setManualLunchEnd] = useState('02:00 PM');
  const [manualLunchNotes, setManualLunchNotes] = useState('Logged by Admin');
  const [isSavingLunch, setIsSavingLunch] = useState(false);

  const { addToast } = useUIStore();

  // If preselectedUserId changes from outside
  useEffect(() => {
    if (preselectedUserId && preselectedUserId !== selectedUserId) {
      setSelectedUserId(preselectedUserId);
    }
  }, [preselectedUserId]);

  // If selectedUserId is empty but availableEmployees has items, pick first
  useEffect(() => {
    if (!selectedUserId && availableEmployees.length > 0) {
      setSelectedUserId(availableEmployees[0].userId);
    }
  }, [selectedUserId, availableEmployees]);

  const loadHistory = useCallback(async () => {
    if (!selectedUserId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await attendanceApi.getEmployeeMonthlyHistory(selectedUserId, selectedMonth);
      setHistoryData(data);
    } catch (err: any) {
      setError(err?.message || 'Could not load monthly attendance history');
    } finally {
      setIsLoading(false);
    }
  }, [selectedUserId, selectedMonth]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Navigate months
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleResetToCurrentMonth = () => {
    setSelectedMonth(currentMonthStr());
  };

  // Open Daily Activity Report
  const handleOpenDailyReport = async (dateStr?: string) => {
    if (!selectedUserId) return;
    const targetDate =
      dateStr ||
      historyData?.days.find((d) => d.isToday)?.date ||
      (historyData?.days && historyData.days.length > 0 ? historyData.days[0].date : `${selectedMonth}-01`);
    setSelectedReportDate(targetDate);
    setIsDailyReportModalOpen(true);
    setIsLoadingReport(true);
    try {
      const rep = await attendanceApi.getEmployeeDailyReport(selectedUserId, targetDate);
      setDailyReportData(rep);
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Could Not Load Report',
        message: err?.message || 'Failed to fetch employee daily activity report',
      });
    } finally {
      setIsLoadingReport(false);
    }
  };

  // Processed and sorted days list (Today first puts today on frontpage page 1)
  const processedDays = useMemo(() => {
    if (!historyData?.days) return [];
    const list = [...historyData.days];
    if (sortOrder === 'today-first') {
      return list.sort((a, b) => b.date.localeCompare(a.date));
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [historyData?.days, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(processedDays.length / pageSize));
  const paginatedDays = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedDays.slice(start, start + pageSize);
  }, [processedDays, currentPage, pageSize]);

  // Reset to page 1 on month or employee change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUserId, selectedMonth]);

  // Filtered employees for dropdown
  const filteredEmployees = useMemo(() => {
    if (!searchEmployeeQuery.trim()) return availableEmployees;
    const q = searchEmployeeQuery.toLowerCase();
    return availableEmployees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.employeeId && e.employeeId.toLowerCase().includes(q)) ||
        (e.department && e.department.toLowerCase().includes(q)) ||
        e.email.toLowerCase().includes(q)
    );
  }, [availableEmployees, searchEmployeeQuery]);

  // Selected employee object
  const currentEmp = useMemo<EmployeeOption | undefined>(() => {
    const fromAvailable = availableEmployees.find((e) => e.userId === selectedUserId);
    if (fromAvailable) return fromAvailable;
    if (historyData?.employee) {
      return {
        userId: historyData.employee.userId,
        name: historyData.employee.name,
        email: historyData.employee.email,
        employeeId: historyData.employee.employeeId,
        department: historyData.employee.department,
        role: historyData.employee.role,
        avatarUrl: historyData.employee.avatarUrl,
        latestSelfie: historyData.employee.latestSelfie,
      };
    }
    return undefined;
  }, [availableEmployees, selectedUserId, historyData]);

  // CSV Export for payroll/attendance
  const handleExportCSV = () => {
    if (!historyData) return;
    const headers = [
      'Date',
      'Day',
      'Status',
      'Punch In Time',
      'Punch Out Time',
      'Shift Duration',
      'Lunch Start',
      'Lunch End',
      'Lunch Duration',
      'Total Lunch For Day',
      'Actor',
    ];

    const rows = historyData.days.map((d) => {
      const firstLunch = d.lunchBreaks && d.lunchBreaks.length > 0 ? d.lunchBreaks[0] : null;
      return [
        `"${d.date}"`,
        `"${d.dayName}"`,
        `"${d.status}"`,
        `"${d.loginTimeFormatted || 'N/A'}"`,
        `"${d.logoutTimeFormatted || 'N/A'}"`,
        `"${d.shiftDurationFormatted}"`,
        `"${firstLunch?.startTimeFormatted || 'N/A'}"`,
        `"${firstLunch?.endTimeFormatted || 'N/A'}"`,
        `"${firstLunch?.durationFormatted || 'N/A'}"`,
        `"${d.totalLunchDurationFormatted}"`,
        `"${d.logoutBy || 'N/A'}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `${(historyData.employee.name || 'Employee').replace(/\s+/g, '_')}_Attendance_Lunch_${historyData.month}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast({
      type: 'success',
      title: 'Monthly History Exported',
      message: `Downloaded CSV report for ${historyData.employee.name} (${historyData.monthLabel})`,
    });
  };

  // Save manual lunch break
  const handleSaveManualLunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !manualLunchDate) return;
    try {
      setIsSavingLunch(true);
      await attendanceApi.recordLunchManual(selectedUserId, {
        date: manualLunchDate,
        startTime: manualLunchStart,
        endTime: manualLunchEnd,
        notes: manualLunchNotes,
      });
      addToast({
        type: 'success',
        title: 'Lunch Recorded',
        message: `Lunch break saved for ${manualLunchDate} (${manualLunchStart} - ${manualLunchEnd})`,
      });
      setIsManualLunchModalOpen(false);
      await loadHistory();
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Save Failed',
        message: err?.message || 'Could not record lunch break.',
      });
    } finally {
      setIsSavingLunch(false);
    }
  };

  const openAddLunchForDate = (dateStr: string) => {
    setManualLunchDate(dateStr);
    setManualLunchStart('01:15 PM');
    setManualLunchEnd('02:00 PM');
    setManualLunchNotes('Logged by Admin');
    setIsManualLunchModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Employee Selector Bar */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Employee Picker */}
          <div className="flex flex-1 items-center gap-3 min-w-[320px] max-w-xl">
            <div className="flex items-center gap-2 shrink-0 text-xs font-bold text-neutral-600">
              <Users className="h-4 w-4 text-blue-600" />
              <span>Select Employee:</span>
            </div>
            <div className="relative flex-1 flex items-center gap-2">
              <div className="relative w-36 sm:w-44 shrink-0">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter name / ID..."
                  value={searchEmployeeQuery}
                  onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 bg-neutral-50 pl-8 pr-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-blue-600 focus:bg-white shadow-2xs transition"
                />
              </div>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 min-w-0 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-900 outline-none focus:border-blue-600 focus:bg-white shadow-2xs transition truncate"
              >
                {filteredEmployees.map((emp) => (
                  <option key={emp.userId} value={emp.userId}>
                    {emp.name} ({emp.employeeId || 'EMP'}) · {emp.department || 'Sales'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Month Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 font-bold text-xs text-neutral-900">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <span>{historyData?.monthLabel || selectedMonth}</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="opacity-0 absolute w-6 cursor-pointer"
                title="Select month"
              />
            </div>

            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetToCurrentMonth}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
            >
              Current Month
            </button>
          </div>

          {/* Actions: View Switcher & Export */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5 text-xs">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition ${
                  viewMode === 'table' ? 'bg-white text-blue-700 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="Table List View"
              >
                <List className="w-3.5 h-3.5" />
                <span>Day-by-Day Table</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition ${
                  viewMode === 'calendar' ? 'bg-white text-blue-700 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="31-Day Calendar View"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Calendar Grid</span>
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={<FileText className="w-3.5 h-3.5 text-indigo-600" />}
              onClick={() => handleOpenDailyReport()}
              disabled={!historyData}
              className="border-indigo-200 text-indigo-800 bg-indigo-50 hover:bg-indigo-100 font-semibold"
            >
              Today's Report
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5 text-emerald-600" />}
              onClick={handleExportCSV}
              disabled={!historyData}
              className="border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold"
            >
              Export CSV
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={() => void loadHistory()}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && !historyData ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center text-sm text-neutral-500">
          <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-600" />
          Loading full monthly arrival and lunch history for employee…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertCircle className="mx-auto h-5 w-5 text-rose-600" />
          <p className="mt-2 text-sm font-semibold text-rose-800">{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void loadHistory()}>
            Retry
          </Button>
        </div>
      ) : historyData ? (
        <>
          {/* Employee Profile Header & Month Badge */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-5 text-white shadow-md border border-neutral-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {currentEmp?.latestSelfie ? (
                  <img
                    src={resolveSelfieUrl(currentEmp.latestSelfie)}
                    alt={historyData.employee.name}
                    className="h-16 w-16 rounded-2xl object-cover border-2 border-emerald-400 shadow-md cursor-pointer hover:opacity-90 transition"
                    onClick={() =>
                      onPreviewSelfie?.({
                        url: resolveSelfieUrl(currentEmp.latestSelfie),
                        name: historyData.employee.name,
                        time: `Monthly History: ${historyData.monthLabel}`,
                      })
                    }
                    title="Click to view photo"
                  />
                ) : (
                  <Avatar name={historyData.employee.name} size="lg" className="border-2 border-white/20" />
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white truncate">{historyData.employee.name}</h2>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-blue-500/30 text-blue-200 border border-blue-400/30 font-bold">
                      {historyData.employee.employeeId || 'EMP'}
                    </span>
                    {historyData.summary.currentlyActive && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        In Office Now
                      </span>
                    )}
                    {historyData.summary.currentlyOnLunch && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 animate-pulse">
                        <Utensils className="w-3 h-3 text-amber-400" />
                        On Lunch Now
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-blue-200/90 mt-1">
                    <span>{historyData.employee.email}</span>
                    <span className="text-blue-400">·</span>
                    <span>{historyData.employee.department}</span>
                    <span className="text-blue-400">·</span>
                    <span className="capitalize">{(historyData.employee.role || '').replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs uppercase tracking-wider text-blue-300 font-bold block">
                  Attendance Month
                </span>
                <span className="text-2xl font-black text-white font-mono">{historyData.monthLabel}</span>
              </div>
            </div>
          </div>

          {/* 4 Rich KPI Metric Summary Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Days Present (Kis-kis din aaya) */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  <CalendarDays className="h-4 w-4 text-emerald-600" />
                  <span>Days Present (दिन आए)</span>
                </span>
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                  {historyData.summary.attendancePercentage}% Attendance
                </span>
              </div>
              <div className="mt-2 text-3xl font-black text-emerald-950 font-mono">
                {historyData.summary.presentDays}{' '}
                <span className="text-sm font-semibold text-emerald-700">/ {historyData.summary.workingDaysElapsed} working days</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-emerald-800 font-medium">
                <span>Full: {historyData.summary.fullDays ?? (historyData.summary.presentDays - historyData.summary.halfDays)}d</span>
                <span>·</span>
                <span className="font-bold text-amber-900">Half Day: {historyData.summary.halfDays}d</span>
                <span>·</span>
                <span>Absent: {historyData.summary.absentDays}d</span>
              </div>
            </div>

            {/* Card 2: Arrival Timings (Kis time aaya) */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-blue-800 uppercase tracking-wider">
                  <LogIn className="h-4 w-4 text-blue-600" />
                  <span>Check-In Time (आने का समय)</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                  Avg Arrival
                </span>
              </div>
              <div className="mt-2 text-3xl font-black text-blue-950 font-mono">
                {historyData.summary.avgLoginTime}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-blue-800 font-medium">
                <span>Shift: 10:00 AM (Late &gt; 10:05 AM = Half Day)</span>
              </div>
            </div>

            {/* Card 3: Lunch Timings & History (Kis time lunch kiya) */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider">
                  <Utensils className="h-4 w-4 text-amber-600" />
                  <span>Lunch History (लंच का समय)</span>
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  {historyData.summary.totalLunchBreaksCount} Lunches
                </span>
              </div>
              <div className="mt-2 text-3xl font-black text-amber-950 font-mono">
                {historyData.summary.totalLunchFormatted}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-amber-800 font-medium">
                <span>Schedule: 01:00 PM · 20m Allowance</span>
              </div>
            </div>

            {/* Card 4: Total Working Hours */}
            <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-purple-800 uppercase tracking-wider">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span>Total Working Time (कुल काम)</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                  Total Shift Hours
                </span>
              </div>
              <div className="mt-2 text-3xl font-black text-purple-950 font-mono">
                {historyData.summary.totalWorkingFormatted}
              </div>
              <div className="mt-1 text-xs text-purple-800 font-medium">
                Recorded shift working duration
              </div>
            </div>
          </div>

          {/* Quick Dates Ribbon: "किस-किस दिन आए हैं" (List of all present dates in the month) */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-neutral-900">
                  Present Dates in {historyData.monthLabel} (किस-किस दिन आए हैं):
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 font-mono">
                  {historyData.summary.presentDates.length} Days
                </span>
              </div>
              <span className="text-[11px] text-neutral-400">Click any date to see exact time details</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {historyData.days
                .filter((d) => d.present)
                .map((d) => (
                  <button
                    key={d.date}
                    onClick={() => setSelectedDayDetails(d)}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition shadow-2xs font-mono cursor-pointer"
                    title={`Check-in: ${d.loginTimeFormatted || 'N/A'}, Lunch: ${d.totalLunchDurationFormatted}`}
                  >
                    <span>{d.date.substring(8)} {d.dayShortName}</span>
                    {d.isOnLunch && <Utensils className="h-3 w-3 text-amber-600 animate-pulse" />}
                  </button>
                ))}
              {historyData.summary.presentDates.length === 0 && (
                <span className="text-xs text-neutral-500 italic">No attendance records found for this month yet.</span>
              )}
            </div>
          </div>

          {/* View Mode 1: Table List View (Day-by-Day Chronological) */}
          {viewMode === 'table' ? (
            <div className="space-y-3">
              {/* Pagination & Sorting Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-2xs">
                {/* Left: Sorting & Quick Jump */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSortOrder('today-first');
                        setCurrentPage(1);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition ${
                        sortOrder === 'today-first'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                      title="Sort with Today and most recent dates first on the front page"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Today First (Front Page)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSortOrder('asc');
                        setCurrentPage(1);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition ${
                        sortOrder === 'asc'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                      title="Sort chronologically from Day 1 to 31"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      <span>1st to 31st (Ascending)</span>
                    </button>
                  </div>

                  {historyData.days.some((d) => d.isToday) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSortOrder('today-first');
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition flex items-center gap-1"
                      title="Jump straight to Today on page 1"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Jump to Today</span>
                    </button>
                  )}
                </div>

                {/* Right: Page Navigation & Page Size */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 text-neutral-500 font-medium">
                    <span>Show:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-bold text-neutral-800 outline-none focus:border-blue-500"
                    >
                      <option value={7}>7 Days / Page</option>
                      <option value={10}>10 Days / Page</option>
                      <option value={15}>15 Days / Page</option>
                      <option value={31}>All Month (31 Days)</option>
                    </select>
                  </div>

                  <div className="h-4 w-px bg-neutral-200" />

                  <span className="font-mono text-neutral-600">
                    Page <strong className="text-neutral-900">{currentPage}</strong> of{' '}
                    <strong>{totalPages}</strong> ({processedDays.length} total)
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="p-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title="Previous Page (Earlier dates)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="p-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title="Next Page (Older dates)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
                <div className="overflow-x-auto max-h-[750px]">
                  <table className="w-full min-w-[1100px] text-left text-xs text-neutral-700">
                    <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50/95 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      <tr>
                        <th className="px-4 py-3.5">Day & Date</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5">Arrival / Check-In Time (आने का समय)</th>
                        <th className="px-4 py-3.5">Departure / Check-Out Time (जाने का समय)</th>
                        <th className="px-4 py-3.5">Shift Working Time</th>
                        <th className="px-4 py-3.5 bg-amber-50/70 border-x border-amber-200 text-amber-950">
                          <div className="flex items-center gap-1 text-amber-900">
                            <Utensils className="w-3.5 h-3.5 text-amber-600" />
                            <span>Lunch Timing & Duration (20m Limit)</span>
                          </div>
                        </th>
                        <th className="px-4 py-3.5">Selfie & Location</th>
                        <th className="px-4 py-3.5 text-right">Daily Report & Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {paginatedDays.map((day) => {
                        const isRowPresent = day.present;
                        const hasLunches = day.lunchBreaks && day.lunchBreaks.length > 0;

                        return (
                          <tr
                            key={day.date}
                            className={`transition-colors hover:bg-blue-50/40 ${
                              day.isToday ? 'bg-blue-50/30 font-medium ring-1 ring-blue-300' : day.isWeekend ? 'bg-neutral-50/50' : ''
                            }`}
                          >
                            {/* Day & Date */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono font-black text-xs ${
                                    day.isToday
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : isRowPresent
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                      : day.isWeekend
                                      ? 'bg-neutral-100 text-neutral-500'
                                      : 'bg-rose-100 text-rose-900'
                                  }`}
                                >
                                  {day.dayNumber}
                                </span>
                                <div>
                                  <div className="font-bold text-neutral-900 text-xs flex items-center gap-1">
                                    <span>{day.dayName}</span>
                                    {day.isToday && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-600 text-white shadow-2xs">
                                        Today
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-mono text-neutral-400">{day.date}</div>
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                  day.status === 'PRESENT'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : day.status === 'HALF_DAY'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : day.status === 'LATE'
                                    ? 'bg-orange-100 text-orange-900 border border-orange-300'
                                    : day.status === 'WEEKEND'
                                    ? 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                                    : day.status === 'UPCOMING'
                                    ? 'bg-neutral-100 text-neutral-400'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    day.status === 'PRESENT'
                                      ? 'bg-emerald-600'
                                      : day.status === 'HALF_DAY'
                                      ? 'bg-amber-600'
                                      : day.status === 'LATE'
                                      ? 'bg-orange-600'
                                      : day.status === 'WEEKEND'
                                      ? 'bg-neutral-400'
                                      : 'bg-rose-600'
                                  }`}
                                />
                                <span>{day.status === 'HALF_DAY' ? 'HALF DAY (Late)' : day.status === 'WEEKEND' ? 'SUNDAY OFF' : day.status}</span>
                              </span>
                            </td>

                            {/* Arrival / Check-in Time */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {day.loginTimeFormatted ? (
                                <div className="space-y-1">
                                  <div className="inline-flex items-center gap-1.5 font-mono font-bold text-xs text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                                    <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{day.loginTimeFormatted}</span>
                                  </div>
                                  {day.loginEvents && day.loginEvents.length > 1 && (
                                    <div className="flex flex-wrap items-center gap-1 pt-0.5 max-w-[280px]">
                                      <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                        {day.loginEvents.length} Sessions
                                      </span>
                                      {day.loginEvents.slice(0, 3).map((ev, sIdx) => (
                                        <span
                                          key={sIdx}
                                          className="text-[9px] font-mono px-1 py-0.2 rounded bg-neutral-100 text-neutral-700 border border-neutral-200"
                                          title={`Session #${sIdx + 1}: ${ev.loginTimeFormatted} to ${ev.logoutTimeFormatted || 'Active'}`}
                                        >
                                          #{sIdx + 1}: {ev.loginTimeFormatted?.replace(/:00\s*/, ' ') || '-'} → {ev.logoutTimeFormatted?.replace(/:00\s*/, ' ') || 'Active'}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-neutral-400 italic text-[11px]">-</span>
                              )}
                            </td>

                            {/* Departure / Check-out Time */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {day.logoutTimeFormatted && day.logoutTimeFormatted !== '-' && day.logoutTimeFormatted !== 'Active Now' && day.logoutTimeFormatted !== 'Active In Office' ? (
                                <div className="space-y-0.5">
                                  <div className="inline-flex items-center gap-1.5 font-mono font-bold text-xs text-amber-950 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
                                    <LogOut className="w-3.5 h-3.5 text-amber-600" />
                                    <span>{day.logoutTimeFormatted}</span>
                                  </div>
                                  {day.logoutBy && (
                                    <div className="text-[10px] text-neutral-500 font-mono">
                                      by {day.logoutBy === 'ADMIN' ? `Admin (${day.logoutAdminName || 'Super Admin'})` : 'Employee'}
                                    </div>
                                  )}
                                </div>
                              ) : isRowPresent ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Active In Office
                                </span>
                              ) : (
                                <span className="text-neutral-400 italic text-[11px]">-</span>
                              )}
                            </td>

                            {/* Shift Duration */}
                            <td className="px-4 py-3.5 whitespace-nowrap font-mono font-semibold text-neutral-800">
                              {isRowPresent ? day.shiftDurationFormatted : '-'}
                            </td>

                            {/* Lunch Timing & Duration (Highlight Column) */}
                            <td className="px-4 py-3.5 bg-amber-50/40 border-x border-amber-200/80">
                              {hasLunches ? (
                                <div className="space-y-1.5">
                                  {day.lunchBreaks.map((b, bIdx) => {
                                    const isOverstay = (b as any).isOverstay || (b.durationSeconds && b.durationSeconds > 1200);
                                    const overstayMins = (b as any).overstaySeconds
                                      ? Math.round((b as any).overstaySeconds / 60)
                                      : b.durationSeconds && b.durationSeconds > 1200
                                      ? Math.round((b.durationSeconds - 1200) / 60)
                                      : 0;

                                    return (
                                      <div
                                        key={bIdx}
                                        className="p-1.5 rounded-lg bg-white border border-amber-200 shadow-2xs space-y-1 font-mono text-xs"
                                      >
                                        <div className="flex items-center justify-between gap-1 text-amber-950 font-bold">
                                          <span className="inline-flex items-center gap-1">
                                            <Utensils className="w-3 h-3 text-amber-600" />
                                            <span>{b.startTimeFormatted || 'N/A'} → {b.endTimeFormatted || 'Ongoing'}</span>
                                          </span>
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                                            isOverstay ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                          }`}>
                                            {b.durationFormatted}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px]">
                                          <span className="text-neutral-500">20m limit</span>
                                          {b.status === 'ONGOING' || !b.endTimeFormatted || b.endTimeFormatted === 'Ongoing' ? (
                                            <span className="text-amber-700 font-bold animate-pulse">🟢 Having Lunch</span>
                                          ) : isOverstay ? (
                                            <span className="text-rose-700 font-bold">
                                              ⚠️ +{overstayMins}m late punch-in
                                            </span>
                                          ) : (
                                            <span className="text-emerald-700 font-bold">
                                              ✅ On time (Within 20m)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {day.isOnLunch && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 animate-pulse">
                                      🟢 Currently Having Lunch
                                    </span>
                                  )}
                                </div>
                              ) : isRowPresent ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-neutral-400 text-[11px] italic">No lunch marked</span>
                                  <button
                                    onClick={() => openAddLunchForDate(day.date)}
                                    className="text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer flex items-center gap-0.5"
                                    title="Add lunch timing for this day"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Log Lunch</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-neutral-300 italic text-[11px]">-</span>
                              )}
                            </td>

                            {/* Selfie & Verification */}
                            <td className="px-4 py-3.5">
                              {day.selfieUrl && day.selfieUrl.length > 5 && !day.selfieUrl.includes('image/svg+xml') ? (
                                <div className="flex items-center gap-2">
                                  <img
                                    src={resolveSelfieUrl(day.selfieUrl)}
                                    alt="Selfie"
                                    onClick={() =>
                                      onPreviewSelfie?.({
                                        url: resolveSelfieUrl(day.selfieUrl),
                                        name: historyData.employee.name,
                                        time: `${day.date} at ${day.loginTimeFormatted || ''}`,
                                        location: day.location?.address,
                                      })
                                    }
                                    className="h-8 w-8 rounded-lg object-cover border border-emerald-400 cursor-pointer hover:scale-105 transition shrink-0"
                                    title="View punch selfie"
                                  />
                                  {day.location?.address && day.location.address !== 'N/A' && (
                                    <div className="max-w-[150px] truncate text-[11px] text-neutral-600">
                                      <span title={day.location.address}>{day.location.address}</span>
                                    </div>
                                  )}
                                </div>
                              ) : isRowPresent ? (
                                <span className="text-[10px] text-neutral-400 font-medium">System Sign-In</span>
                              ) : (
                                <span className="text-neutral-300">-</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Employee Daily Activity Report Button */}
                                <Button
                                  size="xs"
                                  variant="secondary"
                                  onClick={() => handleOpenDailyReport(day.date)}
                                  className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold text-[11px] px-2 shadow-2xs"
                                  title="View what employee did today (tasks, calls, leads & timeline)"
                                  icon={<FileText className="w-3 h-3 text-indigo-600" />}
                                >
                                  Report
                                </Button>

                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => setSelectedDayDetails(day)}
                                >
                                  View
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Pagination Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50/80 px-4 py-3">
                  <div className="text-xs text-neutral-500 font-medium">
                    Showing days <strong className="text-neutral-800">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                    <strong className="text-neutral-800">{Math.min(processedDays.length, currentPage * pageSize)}</strong> of{' '}
                    <strong className="text-neutral-800">{processedDays.length}</strong> days in {historyData.monthLabel}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="xs"
                      variant="secondary"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(1)}
                      className="px-2 py-1 text-xs"
                    >
                      First
                    </Button>
                    <Button
                      size="xs"
                      variant="secondary"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 text-xs"
                      icon={<ChevronLeft className="w-3.5 h-3.5" />}
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }).map((_, i) => {
                        const pageNum = i + 1;
                        if (
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          Math.abs(pageNum - currentPage) <= 1
                        ) {
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`h-7 w-7 rounded-lg font-mono text-xs font-bold transition ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (
                          (pageNum === 2 && currentPage > 3) ||
                          (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                        ) {
                          return <span key={pageNum} className="text-neutral-400 text-xs">…</span>;
                        }
                        return null;
                      })}
                    </div>

                    <Button
                      size="xs"
                      variant="secondary"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 text-xs"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                    <Button
                      size="xs"
                      variant="secondary"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-2 py-1 text-xs"
                    >
                      Last
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* View Mode 2: Calendar Grid View */
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs space-y-3">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-neutral-500 uppercase pb-2 border-b border-neutral-100">
                <span className="text-rose-600">Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {/* Empty days before 1st of month */}
                {(() => {
                  const firstDate = new Date(`${historyData.month}-01T12:00:00Z`);
                  const leadingDays = firstDate.getUTCDay(); // 0 is Sun
                  return Array.from({ length: leadingDays }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-28 rounded-xl bg-neutral-50/40 border border-transparent" />
                  ));
                })()}

                {historyData.days.map((day) => {
                  const isPresent = day.present;
                  const hasLunch = day.lunchBreaks && day.lunchBreaks.length > 0;

                  return (
                    <div
                      key={day.date}
                      onClick={() => setSelectedDayDetails(day)}
                      className={`h-28 rounded-xl p-2 border transition-all cursor-pointer flex flex-col justify-between ${
                        day.isToday
                          ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20'
                          : isPresent
                          ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50'
                          : day.isWeekend
                          ? 'border-neutral-100 bg-neutral-50/50'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50'
                      }`}
                    >
                      {/* Top: Day Number & Status */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-mono font-black text-xs ${
                            isPresent
                              ? 'text-emerald-950 font-black'
                              : day.isWeekend
                              ? 'text-neutral-400'
                              : 'text-neutral-700'
                          }`}
                        >
                          {day.dayNumber}
                        </span>

                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            day.status === 'PRESENT'
                              ? 'bg-emerald-200 text-emerald-900'
                              : day.status === 'LATE'
                              ? 'bg-amber-200 text-amber-900'
                              : day.status === 'WEEKEND'
                              ? 'text-neutral-400'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {day.status === 'WEEKEND' ? 'OFF' : day.status}
                        </span>
                      </div>

                      {/* Middle: Arrival & Departure */}
                      {isPresent ? (
                        <div className="space-y-0.5 text-[10px] font-mono leading-tight">
                          <div className="text-emerald-900 font-bold truncate flex items-center gap-0.5">
                            <span>🕒 {day.loginTimeFormatted?.replace(/:00\s*/, ' ') || 'In'}</span>
                          </div>
                          {day.logoutTimeFormatted && (
                            <div className="text-amber-900 truncate">
                              <span>🚪 {day.logoutTimeFormatted?.replace(/:00\s*/, ' ') || 'Out'}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-[10px] text-neutral-400 italic my-auto">
                          {day.isWeekend ? 'Weekend' : day.isFuture ? '' : 'Absent'}
                        </div>
                      )}

                      {/* Bottom: Lunch badge */}
                      {hasLunch ? (
                        <div className="flex items-center gap-1 rounded bg-amber-100/80 px-1 py-0.5 text-[10px] text-amber-900 font-bold truncate font-mono">
                          <Utensils className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                          <span className="truncate">
                            {day.lunchBreaks[0]?.startTimeFormatted?.replace(/:00\s*/, ' ')} ({day.totalLunchDurationFormatted})
                          </span>
                        </div>
                      ) : isPresent ? (
                        <span className="text-[9px] text-neutral-400 italic truncate">No lunch</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Day Details Flyout / Modal */}
      {selectedDayDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in"
          onClick={() => setSelectedDayDetails(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">
                  {selectedDayDetails.dayName}, {selectedDayDetails.date}
                </h3>
                <p className="text-xs text-neutral-500">
                  Complete day attendance, session logins & lunch breakdown
                </p>
              </div>
              <button
                onClick={() => setSelectedDayDetails(null)}
                className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Attendance Status & Timing Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">Check-in Time (आने का समय)</div>
                <div className="mt-1 text-base font-black text-emerald-950 font-mono">
                  {selectedDayDetails.loginTimeFormatted || 'Not Checked In'}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                <div className="text-[10px] font-bold text-amber-800 uppercase">Check-out Time (जाने का समय)</div>
                <div className="mt-1 text-base font-black text-amber-950 font-mono">
                  {selectedDayDetails.logoutTimeFormatted || 'Still in Office'}
                </div>
              </div>
            </div>

            {/* Lunch Details Section */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                  <Utensils className="w-4 h-4 text-amber-600" />
                  <span>Lunch Breakdown (लंच का पूरा समय):</span>
                </div>
                <span className="font-mono font-bold text-xs text-amber-900 bg-amber-200 px-2 py-0.5 rounded">
                  Total: {selectedDayDetails.totalLunchDurationFormatted}
                </span>
              </div>

              {selectedDayDetails.lunchBreaks && selectedDayDetails.lunchBreaks.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {selectedDayDetails.lunchBreaks.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-200 text-xs font-mono"
                    >
                      <div>
                        <span className="font-bold text-neutral-900">Break #{i + 1}: </span>
                        <span>{b.startTimeFormatted} → {b.endTimeFormatted || 'Ongoing'}</span>
                      </div>
                      <span className="font-bold text-amber-900">{b.durationFormatted}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-amber-800 italic pt-1">
                  No lunch break recorded on this day.
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  openAddLunchForDate(selectedDayDetails.date);
                  setSelectedDayDetails(null);
                }}
                className="mt-2 text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add / Adjust lunch timing for this day</span>
              </button>
            </div>

            {/* Sessions / Relogins */}
            {selectedDayDetails.loginEvents && selectedDayDetails.loginEvents.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Session Logins ({selectedDayDetails.loginEvents.length})
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {selectedDayDetails.loginEvents.map((ev, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 border border-neutral-200 text-xs font-mono"
                    >
                      <span>Session #{i + 1}: {ev.loginTimeFormatted || String(ev.loginTime)}</span>
                      <span className="text-neutral-500">{ev.logoutTimeFormatted || 'Active'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Punch-Out Work Report */}
            {(selectedDayDetails.workReport || selectedDayDetails.developmentChanges || selectedDayDetails.punchOutImageUrl) && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Punch-Out Work Report (कार्य विवरण)
                  </span>
                  {selectedDayDetails.workCategory && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-indigo-800 border border-indigo-200 shadow-2xs">
                      {selectedDayDetails.workCategory}
                    </span>
                  )}
                </div>
                {selectedDayDetails.workReport && (
                  <div className="text-xs text-neutral-800 bg-white p-2.5 rounded-lg border border-indigo-100 whitespace-pre-wrap font-medium">
                    {selectedDayDetails.workReport}
                  </div>
                )}
                {selectedDayDetails.developmentChanges && (
                  <div className="text-[11px] font-mono bg-neutral-900 text-neutral-100 p-2 rounded-lg whitespace-pre-wrap">
                    <div className="text-[10px] font-bold text-amber-400 mb-0.5">Code / Changes:</div>
                    {selectedDayDetails.developmentChanges}
                  </div>
                )}
                {selectedDayDetails.punchOutImageUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <img
                      src={selectedDayDetails.punchOutImageUrl}
                      alt="Departure Selfie"
                      className="h-12 w-12 rounded-lg object-cover border border-rose-300 shadow-2xs cursor-pointer hover:opacity-80 transition"
                      onClick={() =>
                        onPreviewSelfie?.({
                          url: selectedDayDetails.punchOutImageUrl!,
                          name: historyData?.employee.name || 'Employee',
                          time: `Departure Punch-Out (${selectedDayDetails.date})`,
                          location: selectedDayDetails.logoutLocation,
                        })
                      }
                      title="Click to view departure selfie"
                    />
                    <span className="text-[11px] text-neutral-600 font-medium">
                      Departure Selfie Verified
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedDayDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Lunch Record Modal */}
      {isManualLunchModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in"
          onClick={() => !isSavingLunch && setIsManualLunchModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-extrabold text-neutral-900">
                  Record Lunch Break for {currentEmp?.name}
                </h3>
              </div>
              <button
                onClick={() => setIsManualLunchModalOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualLunch} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={manualLunchDate}
                  onChange={(e) => setManualLunchDate(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs font-mono outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Lunch Start Time
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="01:15 PM"
                    value={manualLunchStart}
                    onChange={(e) => setManualLunchStart(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs font-mono outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-neutral-400 mt-0.5">e.g. 01:15 PM</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Lunch End Time
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="02:00 PM"
                    value={manualLunchEnd}
                    onChange={(e) => setManualLunchEnd(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs font-mono outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-neutral-400 mt-0.5">e.g. 02:00 PM</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Note
                </label>
                <input
                  type="text"
                  value={manualLunchNotes}
                  onChange={(e) => setManualLunchNotes(e.target.value)}
                  placeholder="e.g. Logged by Admin"
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsManualLunchModalOpen(false)}
                  disabled={isSavingLunch}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={isSavingLunch}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  {isSavingLunch ? 'Saving...' : 'Save Lunch Record'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Work & Activity Report Modal */}
      {isDailyReportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsDailyReportModalOpen(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Navigation & Title Bar */}
            <div className="flex items-center justify-between border-b border-neutral-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-4 text-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black truncate text-white">
                      Daily Activity & Work Report (कर्मचारी कार्य रिपोर्ट)
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30 font-bold">
                      {dailyReportData?.employee?.name || currentEmp?.name}
                    </span>
                  </div>
                  <p className="text-xs text-blue-200/80 truncate">
                    Track check-in, 20m lunch schedule, calls made, leads touched, and task logs.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedReportDate}
                  onChange={(e) => void handleOpenDailyReport(e.target.value)}
                  className="rounded-lg bg-white/10 border border-white/20 px-2.5 py-1 text-xs text-white font-mono outline-none hover:bg-white/20 transition cursor-pointer"
                  title="Change report date"
                />
                <button
                  type="button"
                  onClick={() => void handleOpenDailyReport(selectedReportDate)}
                  disabled={isLoadingReport}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-blue-200 transition"
                  title="Refresh report"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingReport ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-blue-200 transition"
                  title="Print Report"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsDailyReportModalOpen(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/30 text-white transition"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-neutral-50/50">
              {isLoadingReport ? (
                <div className="py-20 text-center">
                  <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-sm font-semibold text-neutral-600">
                    Generating employee daily work & punch summary…
                  </p>
                </div>
              ) : dailyReportData ? (
                <>
                  {/* Employee Identity Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-neutral-200 shadow-xs">
                    <div className="flex items-center gap-3">
                      <Avatar name={dailyReportData.employee.name} size="md" className="border border-neutral-200" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-neutral-900 text-sm">{dailyReportData.employee.name}</span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-bold border border-neutral-200">
                            {dailyReportData.employee.employeeId || 'EMP'}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          <span>{dailyReportData.employee.department}</span>
                          <span className="mx-1.5 text-neutral-300">·</span>
                          <span className="capitalize">{dailyReportData.employee.role.replace(/_/g, ' ')}</span>
                          <span className="mx-1.5 text-neutral-300">·</span>
                          <span>{dailyReportData.employee.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-500">Report Date:</span>
                      <span className="font-mono text-sm font-black text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        {dailyReportData.date}
                      </span>
                    </div>
                  </div>

                  {/* 4 Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Card 1: Attendance & Arrival */}
                    <div className={`p-3.5 rounded-xl border shadow-xs ${
                      dailyReportData.attendance?.isHalfDay
                        ? 'bg-amber-50/80 border-amber-300'
                        : dailyReportData.attendance?.status === 'PRESENT'
                        ? 'bg-emerald-50/80 border-emerald-200'
                        : 'bg-rose-50/80 border-rose-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1">
                          <LogIn className="w-3.5 h-3.5 text-blue-600" />
                          <span>Check-In (आने का समय)</span>
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          dailyReportData.attendance?.isHalfDay
                            ? 'bg-amber-200 text-amber-900'
                            : dailyReportData.attendance?.status === 'PRESENT'
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-rose-200 text-rose-900'
                        }`}>
                          {dailyReportData.attendance?.isHalfDay ? 'HALF DAY' : dailyReportData.attendance?.status || 'ABSENT'}
                        </span>
                      </div>
                      <div className="mt-2 font-mono text-xl font-black text-neutral-900">
                        {dailyReportData.attendance?.loginTimeFormatted || 'No Check-In'}
                      </div>
                      <div className="text-[11px] mt-1 font-medium">
                        {dailyReportData.attendance?.isHalfDay ? (
                          <span className="text-amber-800 font-bold flex items-center gap-1">
                            ⚠️ Arrived after 10:05 AM (Half Day Applied)
                          </span>
                        ) : dailyReportData.attendance?.loginTimeFormatted ? (
                          <span className="text-emerald-800 font-semibold">
                            ✅ On Time (Shift 10:00 AM)
                          </span>
                        ) : (
                          <span className="text-rose-700 italic">No attendance record found</span>
                        )}
                      </div>
                    </div>

                    {/* Card 2: Lunch Timing & 20m Duration Check */}
                    <div className={`p-3.5 rounded-xl border shadow-xs ${
                      dailyReportData.attendance?.isLunchOverstay
                        ? 'bg-amber-50/80 border-amber-300'
                        : 'bg-emerald-50/80 border-emerald-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1">
                          <Utensils className="w-3.5 h-3.5 text-amber-600" />
                          <span>Lunch Duration (लंच समय)</span>
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                          20m Limit
                        </span>
                      </div>
                      <div className="mt-2 font-mono text-xl font-black text-neutral-900">
                        {dailyReportData.attendance?.totalLunchFormatted || 'No Lunch'}
                      </div>
                      <div className="text-[11px] mt-1">
                        {dailyReportData.attendance?.isOnLunch ? (
                          <span className="text-amber-800 font-bold animate-pulse">
                            ⏳ Currently On Lunch Break
                          </span>
                        ) : dailyReportData.attendance?.isLunchOverstay ? (
                          <span className="text-amber-900 font-bold">
                            ⚠️ +{dailyReportData.attendance.lunchOverstayFormatted} late punch-in
                          </span>
                        ) : dailyReportData.attendance?.totalLunchDurationSeconds ? (
                          <span className="text-emerald-800 font-semibold">
                            ✅ Within 20 min allowance
                          </span>
                        ) : (
                          <span className="text-neutral-500 italic">No lunch taken today</span>
                        )}
                      </div>
                    </div>

                    {/* Card 3: Shift Working Time */}
                    <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/70 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                          <span>Shift Time (ऑफिस समय)</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                          Total Hours
                        </span>
                      </div>
                      <div className="mt-2 font-mono text-xl font-black text-purple-950">
                        {dailyReportData.attendance?.shiftDurationFormatted || '0s'}
                      </div>
                      <div className="text-[11px] mt-1 text-purple-800 font-medium truncate">
                        Departure: {dailyReportData.attendance?.logoutTimeFormatted || 'Active In Office'}
                      </div>
                    </div>

                    {/* Card 4: Daily Productivity Overview */}
                    <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span>Work Actions (आज का काम)</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 font-mono">
                          {dailyReportData.summary.totalTimelineEvents} Events
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-mono text-xl font-black text-blue-950">
                          {dailyReportData.summary.totalCalls} Calls
                        </span>
                        <span className="text-xs text-blue-700">· {dailyReportData.summary.totalLeadsHandled} Leads</span>
                      </div>
                      <div className="text-[11px] mt-1 text-blue-800 font-medium">
                        Tasks Done: {dailyReportData.summary.totalTasksCompleted} · Talk Time: {dailyReportData.summary.totalCallDurationFormatted}
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Split: Sessions & Lunch on Left, Unified Work Timeline on Right */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left Column (5 cols): Punch Sessions & Lunch Details */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Lunch Breaks Detailed Card */}
                      <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                          <div className="flex items-center gap-2">
                            <Utensils className="w-4 h-4 text-amber-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                              Lunch Break Timings (लंच शुरू व punch-in समय)
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            Sched: 1:00 PM · 20m
                          </span>
                        </div>

                        {dailyReportData.attendance?.lunchBreaks && dailyReportData.attendance.lunchBreaks.length > 0 ? (
                          <div className="space-y-2">
                            {dailyReportData.attendance.lunchBreaks.map((b, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                                  b.isOverstay ? 'bg-amber-50/80 border-amber-300' : 'bg-emerald-50/50 border-emerald-200'
                                }`}
                              >
                                <div className="flex items-center justify-between font-mono font-bold">
                                  <span className="text-neutral-900">Break #{idx + 1}</span>
                                  <span className={b.isOverstay ? 'text-amber-900' : 'text-emerald-800'}>
                                    {b.durationFormatted}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-neutral-600 text-[11px] font-mono">
                                  <span>Start: {b.startTimeFormatted}</span>
                                  <span>Punch-in: {b.endTimeFormatted || 'Ongoing Break'}</span>
                                </div>
                                <div className="text-[11px] pt-0.5 font-medium">
                                  {b.isOverstay ? (
                                    <span className="text-amber-900 font-bold flex items-center gap-1">
                                      ⚠️ {b.overstayFormatted} late punch-in (Exceeded 20 min rule)
                                    </span>
                                  ) : (
                                    <span className="text-emerald-800 font-semibold flex items-center gap-1">
                                      ✅ Within 20 min scheduled allowance
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-4 text-center text-xs text-neutral-400 italic bg-neutral-50 rounded-xl">
                            No lunch break recorded on this date.
                          </div>
                        )}
                      </div>

                      {/* Daily Login/Logout Sessions Card */}
                      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                          <div className="flex items-center gap-2">
                            <LogIn className="w-4 h-4 text-blue-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                              All Login & Logout Sessions ({dailyReportData.attendance?.sessions?.length || 0})
                            </h4>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-medium">Multi-punch log</span>
                        </div>

                        {dailyReportData.attendance?.sessions && dailyReportData.attendance.sessions.length > 0 ? (
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {dailyReportData.attendance.sessions.map((sess) => (
                              <div
                                key={sess.sessionNumber}
                                className="p-2.5 rounded-lg border border-neutral-200 bg-neutral-50/80 text-xs font-mono space-y-1"
                              >
                                <div className="flex items-center justify-between font-bold">
                                  <span className="text-neutral-800">Session #{sess.sessionNumber}</span>
                                  <span className={sess.logoutTimeFormatted === 'Active / Still Logged In' ? 'text-emerald-600 font-bold' : 'text-neutral-600'}>
                                    {sess.logoutTimeFormatted === 'Active / Still Logged In' ? 'Active In Office' : 'Completed'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-neutral-600 flex items-center justify-between">
                                  <span>In: {sess.loginTimeFormatted}</span>
                                  <span>Out: {sess.logoutTimeFormatted}</span>
                                </div>
                                {sess.ipAddress && (
                                  <div className="text-[10px] text-neutral-400 truncate">
                                    IP: {sess.ipAddress} {sess.logoutBy ? `· Exit: ${sess.logoutBy}` : ''}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-4 text-center text-xs text-neutral-400 italic bg-neutral-50 rounded-xl">
                            No punch sessions recorded.
                          </div>
                        )}
                      </div>

                      {/* Selfie & Location Card (if available) */}
                      {(dailyReportData.attendance?.selfieUrl || dailyReportData.attendance?.location) && (
                        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-100 pb-2">
                            Check-in Photo & Office Location
                          </h4>
                          <div className="flex items-center gap-3 pt-1">
                            {dailyReportData.attendance.selfieUrl && (
                              <img
                                src={dailyReportData.attendance.selfieUrl}
                                alt="Checkin Selfie"
                                className="h-16 w-16 rounded-xl object-cover border-2 border-emerald-400 shadow-xs cursor-pointer hover:opacity-90 transition"
                                onClick={() =>
                                  onPreviewSelfie?.({
                                    url: dailyReportData.attendance!.selfieUrl!,
                                    name: dailyReportData.employee.name,
                                    time: `Check-in Photo (${dailyReportData.date})`,
                                    location: dailyReportData.attendance?.location,
                                  })
                                }
                                title="Click to view full photo"
                              />
                            )}
                            <div className="text-xs text-neutral-600 min-w-0">
                              <div className="font-semibold text-neutral-900">Attendance Location:</div>
                              <div className="text-[11px] text-neutral-500 truncate">
                                {dailyReportData.attendance.location || 'NX One, Techzone 4, Greater Noida'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Punch-Out Work Report & Departure Card */}
                      {(dailyReportData.attendance?.workReport ||
                        dailyReportData.attendance?.workCategory ||
                        dailyReportData.attendance?.developmentChanges ||
                        dailyReportData.attendance?.punchOutImageUrl) && (
                        <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 p-4 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-indigo-600" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                                Punch-Out Work Report (कार्य विवरण)
                              </h4>
                            </div>
                            {dailyReportData.attendance.workCategory && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                                {dailyReportData.attendance.workCategory}
                              </span>
                            )}
                          </div>

                          {/* Work Report Text */}
                          {dailyReportData.attendance.workReport && (
                            <div className="rounded-lg bg-white p-3 border border-indigo-100 text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed shadow-2xs">
                              <div className="text-[10px] font-bold uppercase text-indigo-600 mb-1">Daily Task Summary / Report:</div>
                              {dailyReportData.attendance.workReport}
                            </div>
                          )}

                          {/* Development / Code Changes if present */}
                          {dailyReportData.attendance.developmentChanges && (
                            <div className="rounded-lg bg-neutral-900 text-neutral-100 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                              <div className="text-[10px] font-bold uppercase text-amber-400 mb-1">Development / Code Changes:</div>
                              {dailyReportData.attendance.developmentChanges}
                            </div>
                          )}

                          {/* Departure Selfie & Punchout Location */}
                          {(dailyReportData.attendance.punchOutImageUrl || dailyReportData.attendance.logoutLocation) && (
                            <div className="flex items-center gap-3 pt-1 border-t border-indigo-100/70">
                              {dailyReportData.attendance.punchOutImageUrl && (
                                <img
                                  src={dailyReportData.attendance.punchOutImageUrl}
                                  alt="Departure Selfie"
                                  className="h-16 w-16 rounded-xl object-cover border-2 border-rose-400 shadow-xs cursor-pointer hover:opacity-90 transition shrink-0"
                                  onClick={() =>
                                    onPreviewSelfie?.({
                                      url: dailyReportData.attendance!.punchOutImageUrl!,
                                      name: dailyReportData.employee.name,
                                      time: `Departure Punch-Out (${dailyReportData.date})`,
                                      location: dailyReportData.attendance?.logoutLocation,
                                    })
                                  }
                                  title="Click to view departure photo"
                                />
                              )}
                              <div className="text-xs text-neutral-600 min-w-0">
                                <div className="font-semibold text-neutral-900">Departure Location:</div>
                                <div className="text-[11px] text-neutral-500 truncate">
                                  {dailyReportData.attendance.logoutLocation || dailyReportData.attendance.location || 'Office Logged'}
                                </div>
                                {dailyReportData.attendance.reportSubmittedAt && (
                                  <div className="text-[10px] text-neutral-400 mt-0.5">
                                    Submitted at: {new Date(dailyReportData.attendance.reportSubmittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Column (7 cols): Full Chronological Activity Timeline */}
                    <div className="lg:col-span-7">
                      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs space-y-3 h-full flex flex-col">
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-2 shrink-0">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-indigo-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                              Today's Complete Activity Timeline (आज क्या-क्या किया)
                            </h4>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-neutral-500">
                            {dailyReportData.timeline.length} actions
                          </span>
                        </div>

                        {dailyReportData.timeline && dailyReportData.timeline.length > 0 ? (
                          <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[500px]">
                            {dailyReportData.timeline.map((item, idx) => {
                              const badgeStyle =
                                item.badgeColor === 'emerald'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : item.badgeColor === 'amber'
                                  ? 'bg-amber-100 text-amber-900 border-amber-200'
                                  : item.badgeColor === 'purple'
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : item.badgeColor === 'rose'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : item.badgeColor === 'blue'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : 'bg-neutral-100 text-neutral-700 border-neutral-200';

                              const iconComponent =
                                item.type === 'CHECK_IN' ? (
                                  <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                                ) : item.type === 'CHECK_OUT' ? (
                                  <LogOut className="w-3.5 h-3.5 text-amber-600" />
                                ) : item.type === 'LUNCH_START' || item.type === 'LUNCH_END' ? (
                                  <Utensils className="w-3.5 h-3.5 text-amber-600" />
                                ) : item.type === 'CALL' ? (
                                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                                ) : item.type === 'LEAD' ? (
                                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                                );

                              return (
                                <div
                                  key={idx}
                                  className="relative flex items-start gap-3 p-3 rounded-xl border border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50/60 transition"
                                >
                                  {/* Time & Icon */}
                                  <div className="flex flex-col items-center shrink-0 w-20 text-right">
                                    <span className="font-mono text-xs font-bold text-neutral-900">
                                      {item.time}
                                    </span>
                                    <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 border border-neutral-200">
                                      {iconComponent}
                                    </div>
                                  </div>

                                  {/* Event Content */}
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center justify-between gap-1">
                                      <span className="text-xs font-bold text-neutral-900 truncate">
                                        {item.title}
                                      </span>
                                      {item.badge && (
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                                          {item.badge}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-wrap">
                                      {item.description}
                                    </p>

                                    {/* Work Report details on CHECK_OUT timeline event */}
                                    {item.type === 'CHECK_OUT' && (item.workReport || item.developmentChanges || item.punchOutImageUrl) && (
                                      <div className="mt-2.5 rounded-lg border border-rose-200 bg-rose-50/50 p-2.5 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-rose-900 flex items-center gap-1">
                                            <FileText className="w-3.5 h-3.5 text-rose-600" />
                                            Punch-Out Work Report:
                                          </span>
                                          {item.workCategory && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-rose-800 border border-rose-200 shadow-2xs">
                                              {item.workCategory}
                                            </span>
                                          )}
                                        </div>
                                        {item.workReport && (
                                          <div className="text-xs text-neutral-800 bg-white p-2 rounded border border-rose-100 whitespace-pre-wrap font-medium">
                                            {item.workReport}
                                          </div>
                                        )}
                                        {item.developmentChanges && (
                                          <div className="text-[11px] font-mono bg-neutral-900 text-neutral-100 p-2 rounded whitespace-pre-wrap">
                                            <div className="text-[10px] font-bold text-amber-400 mb-0.5">Code / Task Changes:</div>
                                            {item.developmentChanges}
                                          </div>
                                        )}
                                        {item.punchOutImageUrl && (
                                          <div className="flex items-center gap-2 pt-1">
                                            <img
                                              src={item.punchOutImageUrl}
                                              alt="Departure Selfie"
                                              className="h-12 w-12 rounded-lg object-cover border border-rose-300 shadow-2xs cursor-pointer hover:opacity-80 transition"
                                              onClick={() =>
                                                onPreviewSelfie?.({
                                                  url: item.punchOutImageUrl!,
                                                  name: dailyReportData.employee.name,
                                                  time: `Departure Punch-Out (${dailyReportData.date})`,
                                                })
                                              }
                                              title="Click to view departure selfie"
                                            />
                                            <span className="text-[11px] text-neutral-600 font-medium">
                                              Departure Selfie Verified
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-16 text-center text-xs text-neutral-400 italic bg-neutral-50 rounded-xl">
                            No specific CRM activity logs or calls found for this employee on this date.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-16 text-center text-sm text-neutral-500">
                  Select a valid date to view employee daily activity report.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-neutral-200 bg-white p-3.5 px-6 shrink-0">
              <div className="text-xs text-neutral-500 font-medium">
                Standard shift check-in: 10:00 AM · Lunch break: 01:00 PM (20m allowance)
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsDailyReportModalOpen(false)}
                className="font-bold"
              >
                Close Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
