import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { KPICard } from '@/components/patterns/KPICard';
import { SlideOverPanel } from '@/components/patterns/SlideOverPanel';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { attendanceApi, AttendanceLoginEvent, AttendanceRecord } from './api/attendanceApi';
import {
  Clock3,
  CalendarDays,
  Users,
  RefreshCw,
  AlertCircle,
  Camera,
  MapPin,
  ExternalLink,
  Search,
  CheckCircle2,
  X,
  LogIn,
  LogOut,
  Clock,
  Shield,
  User,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

interface EmployeeMonthSummary {
  userId: string;
  employeeId?: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  role: string;
  records: AttendanceRecord[];
  daysPresent: number;
  loginCount: number;
  logoutCount: number;
  latestLogin: string;
  latestLogout?: string;
  latestSelfie?: string;
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function parseToValidDate(value?: any, fallbackDateStr?: string): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  const str = String(value).trim();
  if (
    !str ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined' ||
    str.toLowerCase() === 'invalid date'
  ) {
    return null;
  }

  // 1. Direct standard parse (e.g. ISO string "2026-10-04T08:47:09.752Z")
  const directDate = new Date(str);
  if (!isNaN(directDate.getTime())) {
    return directDate;
  }

  // 2. Check if it's a 12-hour or 24-hour time string like "02:17:09 pm" or "14:17:09"
  const time12Match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (time12Match) {
    let hours = parseInt(time12Match[1], 10);
    const minutes = parseInt(time12Match[2], 10);
    const seconds = time12Match[3] ? parseInt(time12Match[3], 10) : 0;
    const ampm = time12Match[4]?.toLowerCase();

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    let baseYear: number;
    let baseMonth: number;
    let baseDay: number;

    if (fallbackDateStr && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDateStr)) {
      const [y, m, d] = fallbackDateStr.split('-').map(Number);
      baseYear = y;
      baseMonth = m - 1;
      baseDay = d;
    } else {
      const now = new Date();
      baseYear = now.getFullYear();
      baseMonth = now.getMonth();
      baseDay = now.getDate();
    }

    const d = new Date(baseYear, baseMonth, baseDay, hours, minutes, seconds);
    return isNaN(d.getTime()) ? null : d;
  }

  // 3. Check for "DD/MM/YYYY hh:mm:ss am/pm"
  const ddmmyyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    let hours = ddmmyyyyMatch[4] ? parseInt(ddmmyyyyMatch[4], 10) : 0;
    const minutes = ddmmyyyyMatch[5] ? parseInt(ddmmyyyyMatch[5], 10) : 0;
    const seconds = ddmmyyyyMatch[6] ? parseInt(ddmmyyyyMatch[6], 10) : 0;
    const ampm = ddmmyyyyMatch[7]?.toLowerCase();

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    const d = new Date(year, month, day, hours, minutes, seconds);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

const getLoginEvents = (record: AttendanceRecord): AttendanceLoginEvent[] => {
  const sanitizeLogout = (val?: string) => {
    if (!val || val.toLowerCase() === 'null' || val.toLowerCase() === 'undefined' || val.toLowerCase() === 'invalid date') {
      return undefined;
    }
    return val;
  };

  const recLogout = sanitizeLogout(record.logoutTime);

  if (record.loginEvents?.length) {
    const events = record.loginEvents.map((e) => ({
      ...e,
      logoutTime: sanitizeLogout(e.logoutTime),
      logoutBy: e.logoutBy || record.logoutBy,
      logoutAdminName: e.logoutAdminName || record.logoutAdminName,
    })).sort(
      (a, b) => (parseToValidDate(a.loginTime, record.date)?.getTime() || 0) - (parseToValidDate(b.loginTime, record.date)?.getTime() || 0)
    );
    if ((parseToValidDate(record.loginTime, record.date)?.getTime() || 0) < (parseToValidDate(events[0].loginTime, record.date)?.getTime() || 0)) {
      events.unshift({
        loginTime: record.loginTime,
        logoutTime: recLogout,
        logoutBy: record.logoutBy,
        logoutAdminName: record.logoutAdminName,
      });
    }
    if (recLogout && !events[events.length - 1].logoutTime) {
      events[events.length - 1].logoutTime = recLogout;
      events[events.length - 1].logoutBy = record.logoutBy;
      events[events.length - 1].logoutAdminName = record.logoutAdminName;
    }
    return events;
  }
  return [
    {
      loginTime: record.loginTime,
      logoutTime: recLogout,
      logoutBy: record.logoutBy,
      logoutAdminName: record.logoutAdminName,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
    },
  ];
};

function formatDateTime(value?: any, fallbackDateStr?: string): string {
  if (!value) return 'Not recorded';
  const str = String(value).trim();
  if (!str || str.toLowerCase() === 'invalid date' || str.toLowerCase() === 'null') return 'Not recorded';

  const parsed = parseToValidDate(value, fallbackDateStr);
  if (parsed) {
    return parsed.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });
  }

  if (fallbackDateStr) {
    return `${fallbackDateStr}, ${str}`;
  }
  return str;
}

function formatExactTime(value?: any, fallbackDateStr?: string): string {
  if (!value) return 'Not recorded';
  const str = String(value).trim();
  if (!str || str.toLowerCase() === 'invalid date' || str.toLowerCase() === 'null') return 'Not recorded';

  const parsed = parseToValidDate(value, fallbackDateStr);
  if (parsed) {
    return parsed.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  }

  // If already a clean 12h time string like "02:17:09 pm"
  const timeMatch = str.match(/^(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)$/i);
  if (timeMatch) {
    return timeMatch[1];
  }

  return 'Not recorded';
}

function formatDuration(loginTime: string, logoutTime?: string, fallbackDateStr?: string): string {
  if (!logoutTime || logoutTime.toLowerCase() === 'invalid date' || logoutTime.toLowerCase() === 'null') {
    return 'Active / In Progress';
  }
  const start = parseToValidDate(loginTime, fallbackDateStr);
  const end = parseToValidDate(logoutTime, fallbackDateStr);
  if (!start || !end) return 'Active / In Progress';
  const startTime = start.getTime();
  const endTime = end.getTime();
  if (isNaN(startTime) || isNaN(endTime) || endTime <= startTime) {
    return 'Active / In Progress';
  }
  const totalSeconds = Math.floor((endTime - startTime) / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds} secs`;
  }
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min${minutes > 1 ? 's' : ''}`;
  return `${hours} hr${hours > 1 ? 's' : ''} ${minutes} min${minutes > 1 ? 's' : ''}`;
}

export function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'punches' | 'summary'>('punches');
  const [month, setMonth] = useState(currentMonthValue);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeMonthSummary | null>(null);
  const [previewSelfie, setPreviewSelfie] = useState<{ url: string; name: string; time: string; location?: string } | null>(null);
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loggingOutUserId, setLoggingOutUserId] = useState<string | null>(null);
  const { addToast } = useUIStore();

  const loadAttendance = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = activeTab === 'summary'
        ? await (async () => {
            const [year, monthNumber] = month.split('-').map(Number);
            const lastDay = new Date(year, monthNumber, 0).getDate();
            return attendanceApi.getAttendance(`${month}-01`, `${month}-${String(lastDay).padStart(2, '0')}`);
          })()
        : await attendanceApi.getAttendance();

      setRecords(response.records || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load employee attendance.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, month]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await attendanceApi.syncExternal();
      setSyncFeedback(res.message || `Synced ${res.syncedCount} records.`);
      await loadAttendance();
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err: any) {
      setSyncFeedback(`Sync note: ${err?.message || 'Server error'}`);
      setTimeout(() => setSyncFeedback(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForceLogout = async (record: AttendanceRecord) => {
    if (!window.confirm(`Are you sure you want to remotely logout ${record.userName}?\nTheir dashboard session will be closed immediately and punch-out will be recorded in Attendance as 'ADMIN'.`)) {
      return;
    }
    try {
      setLoggingOutUserId(record.userId);
      const res = await attendanceApi.forceLogout(record.userId);
      addToast({
        type: 'success',
        title: `${record.userName} Logged Out`,
        message: res.message || 'Employee session terminated and attendance updated by Admin.',
      });
      await loadAttendance();
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Logout Failed',
        message: err?.message || 'Could not logout employee.',
      });
    } finally {
      setLoggingOutUserId(null);
    }
  };

  const employees = useMemo(() => {
    const byUser = new Map<string, EmployeeMonthSummary>();
    for (const record of records) {
      const existing = byUser.get(record.userId);
      if (existing) {
        existing.records.push(record);
        if (!existing.latestSelfie && record.selfieUrl) {
          existing.latestSelfie = record.selfieUrl;
        }
        continue;
      }
      byUser.set(record.userId, {
        userId: record.userId,
        employeeId: record.employeeId,
        name: record.userName,
        email: record.userEmail,
        phone: record.userPhone,
        department: record.department,
        role: record.role,
        records: [record],
        daysPresent: 0,
        loginCount: 0,
        logoutCount: 0,
        latestLogin: record.loginTime,
        latestLogout: record.logoutTime,
        latestSelfie: record.selfieUrl,
      });
    }

    return Array.from(byUser.values())
      .map((employee) => {
        const allEvents = employee.records.flatMap(getLoginEvents);
        const logoutEvents = allEvents.filter(
          (e) => Boolean(e.logoutTime) && String(e.logoutTime).toLowerCase() !== 'invalid date'
        );
        const latestLogout = logoutEvents.reduce(
          (latest, event) => {
            if (!event.logoutTime) return latest;
            const curTime = parseToValidDate(event.logoutTime, employee.records[0]?.date)?.getTime() || 0;
            const latTime = latest ? (parseToValidDate(latest, employee.records[0]?.date)?.getTime() || 0) : 0;
            return curTime > latTime ? event.logoutTime : latest;
          },
          undefined as string | undefined
        );

        return {
          ...employee,
          daysPresent: new Set(employee.records.map((record) => record.date)).size,
          loginCount: allEvents.length,
          logoutCount: logoutEvents.length,
          latestLogin: allEvents.reduce(
            (latest, event) => {
              const cur = parseToValidDate(event.loginTime, employee.records[0]?.date)?.getTime() || 0;
              const lat = parseToValidDate(latest, employee.records[0]?.date)?.getTime() || 0;
              return cur > lat ? event.loginTime : latest;
            },
            allEvents[0]?.loginTime || employee.latestLogin
          ),
          latestLogout,
          records: employee.records.sort((a, b) => b.date.localeCompare(a.date)),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  // Filtered punch records for the live feed
  const filteredPunchRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (r.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.location?.address || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter]);

  const handleOpenEmployeeDetails = useCallback(
    (record: AttendanceRecord | EmployeeMonthSummary) => {
      if ('records' in record && Array.isArray((record as EmployeeMonthSummary).records)) {
        setSelectedEmployee(record as EmployeeMonthSummary);
        return;
      }
      const rec = record as AttendanceRecord;
      const found = employees.find(
        (e) => e.userId === rec.userId || (rec.userName && e.name.toLowerCase() === rec.userName.toLowerCase())
      );
      if (found) {
        setSelectedEmployee(found);
      } else {
        const userRecords = records.filter(
          (r) => r.userId === rec.userId || (rec.userName && r.userName.toLowerCase() === rec.userName.toLowerCase())
        );
        const allEvents = userRecords.flatMap(getLoginEvents);
        const logoutEvents = allEvents.filter(
          (e) => Boolean(e.logoutTime) && String(e.logoutTime).toLowerCase() !== 'invalid date'
        );
        const latestLogout = logoutEvents.reduce(
          (latest, event) => {
            if (!event.logoutTime) return latest;
            const curTime = parseToValidDate(event.logoutTime, userRecords[0]?.date)?.getTime() || 0;
            const latTime = latest ? (parseToValidDate(latest, userRecords[0]?.date)?.getTime() || 0) : 0;
            return curTime > latTime ? event.logoutTime : latest;
          },
          undefined as string | undefined
        );

        setSelectedEmployee({
          userId: rec.userId,
          employeeId: rec.employeeId,
          name: rec.userName,
          email: rec.userEmail,
          phone: rec.userPhone,
          department: rec.department,
          role: rec.role,
          records: userRecords.sort((a, b) => b.date.localeCompare(a.date)),
          daysPresent: new Set(userRecords.map((r) => r.date)).size || 1,
          loginCount: allEvents.length || 1,
          logoutCount: logoutEvents.length,
          latestLogin: rec.loginTime,
          latestLogout,
          latestSelfie: rec.selfieUrl,
        });
      }
    },
    [employees, records]
  );

  useEffect(() => {
    if (urlSearch && records.length > 0 && !selectedEmployee) {
      const match = records.find(
        (r) =>
          (r.employeeId && r.employeeId.toLowerCase() === urlSearch.toLowerCase()) ||
          (r.userName && r.userName.toLowerCase().includes(urlSearch.toLowerCase()))
      );
      if (match) {
        handleOpenEmployeeDetails(match);
      }
    }
  }, [urlSearch, records, selectedEmployee, handleOpenEmployeeDetails]);

  const totalAttendanceDays = employees.reduce((sum, employee) => sum + employee.daysPresent, 0);
  const totalPunchIns = records.flatMap(getLoginEvents).length;
  const totalPunchOuts = records.flatMap(getLoginEvents).filter((e) => Boolean(e.logoutTime)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Employee Attendance</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Live App Synced
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Real-time selfie logs, GPS verification, and monthly attendance rosters from Attendance CRM.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'summary' && (
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-neutral-600" htmlFor="attendance-month">
                Month
              </label>
              <input
                id="attendance-month"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          )}

          <Button
            variant="primary"
            size="sm"
            disabled={isSyncing}
            icon={<RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />}
            onClick={() => void handleSyncNow()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
          >
            {isSyncing ? 'Syncing...' : 'Sync Attendance App'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={() => void loadAttendance()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncFeedback && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800 transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{syncFeedback}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <WidgetBoundary name="attendance-employees">
          <KPICard
            label="Employees Active"
            value={employees.length}
            subtext="Tracked roster staff"
            accent="blue"
            icon={<Users className="h-4 w-4 text-blue-600" />}
          />
        </WidgetBoundary>
        <WidgetBoundary name="attendance-days">
          <KPICard
            label="Days Present (This Month)"
            value={totalAttendanceDays}
            subtext="Total marked presence"
            accent="green"
            icon={<CalendarDays className="h-4 w-4 text-emerald-600" />}
          />
        </WidgetBoundary>
        <WidgetBoundary name="attendance-logins">
          <KPICard
            label="Total Logins (Check-Ins)"
            value={totalPunchIns}
            subtext="Punch-ins recorded"
            accent="neutral"
            icon={<LogIn className="h-4 w-4 text-emerald-600" />}
          />
        </WidgetBoundary>
        <WidgetBoundary name="attendance-logouts">
          <KPICard
            label="Total Logouts (Check-Outs)"
            value={totalPunchOuts}
            subtext={
              totalPunchIns > totalPunchOuts
                ? `${totalPunchIns - totalPunchOuts} currently active`
                : 'All shifts concluded'
            }
            accent="blue"
            icon={<LogOut className="h-4 w-4 text-amber-600" />}
          />
        </WidgetBoundary>
      </div>

      {/* Tab Controls & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('punches')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === 'punches'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>Live Selfie & Punch Records</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 font-bold">
              {records.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Monthly Employee Roster</span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 font-bold">
              {employees.length}
            </span>
          </button>
        </div>

        {activeTab === 'punches' && (
          <div className="flex items-center gap-2 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search employee, ID, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 rounded-lg border border-neutral-300 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Areas */}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertCircle className="mx-auto h-5 w-5 text-rose-600" />
          <p className="mt-2 text-sm font-semibold text-rose-800">Attendance could not be loaded.</p>
          <p className="mt-1 text-xs text-rose-700">{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void loadAttendance()}>
            Retry
          </Button>
        </div>
      ) : isLoading && !records.length ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center text-sm text-neutral-500">
          <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-600" />
          Loading attendance and selfie records…
        </div>
      ) : activeTab === 'punches' ? (
        /* LIVE PUNCHES VIEW WITH SELFIES */
        filteredPunchRecords.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
            <Clock3 className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 text-sm font-semibold text-neutral-700">No punch records found</p>
            <p className="mt-1 text-xs text-neutral-500">
              When employees mark attendance on the Attendance CRM app, their selfies and GPS data appear here.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => void handleSyncNow()}
            >
              Sync from Attendance CRM
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Selfie Photo</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Login Timing</th>
                    <th className="px-4 py-3">Logout Timing</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">GPS Location & Address</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredPunchRecords.map((record) => (
                    <tr
                      key={record._id}
                      onClick={() => handleOpenEmployeeDetails(record)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      {/* Selfie Column */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {record.selfieUrl ? (
                          <div
                            onClick={() =>
                              setPreviewSelfie({
                                url: record.selfieUrl!,
                                name: record.userName,
                                time: formatDateTime(record.loginTime, record.date),
                                location: record.location?.address,
                              })
                            }
                            className="group/selfie relative h-12 w-12 cursor-pointer overflow-hidden rounded-lg border-2 border-emerald-500 shadow-sm transition-transform hover:scale-105"
                            title="Click to enlarge selfie"
                          >
                            <img
                              src={record.selfieUrl}
                              alt={record.userName}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/selfie:opacity-100 transition-opacity">
                              <Camera className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 border border-neutral-200">
                            <Camera className="h-5 w-5" />
                          </div>
                        )}
                      </td>

                      {/* Employee Column */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={record.userName} size="sm" />
                          <div>
                            <div className="font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                              <span>{record.userName}</span>
                              <span className="text-[10px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                • View History →
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                              <span className="font-mono font-medium text-blue-700 bg-blue-50 px-1 rounded">
                                {record.employeeId || 'EMP'}
                              </span>
                              <span>·</span>
                              <span>{record.department || 'Sales'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Punch Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-neutral-800">
                          {new Date(`${record.date}T12:00:00Z`).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'Asia/Kolkata',
                          })}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-400">{record.date}</div>
                      </td>

                      {/* Login Timing */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                          <LogIn className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{formatExactTime(record.loginTime, record.date)}</span>
                        </div>
                      </td>

                      {/* Logout Timing */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {record.logoutTime && String(record.logoutTime).toLowerCase() !== 'invalid date' ? (
                          <div className="flex flex-col gap-1 items-start">
                            <div className="inline-flex items-center gap-1.5 font-mono font-bold text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                              <LogOut className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              <span>{formatExactTime(record.logoutTime, record.date)}</span>
                            </div>
                            {record.logoutBy === 'ADMIN' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-mono" title={`Remotely punched out by ${record.logoutAdminName || 'Admin'}`}>
                                <Shield className="w-3 h-3 text-rose-600" />
                                <span>Admin {record.logoutAdminName ? `(${record.logoutAdminName})` : ''}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-mono">
                                <User className="w-3 h-3 text-blue-600" />
                                <span>Employee</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Active</span>
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleForceLogout(record);
                              }}
                              disabled={loggingOutUserId === record.userId}
                              className="px-2 py-1 text-[10px] font-bold rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Remotely logout employee & record attendance punch-out as Admin"
                            >
                              {loggingOutUserId === record.userId ? (
                                <RefreshCw className="w-3 h-3 animate-spin text-rose-600" />
                              ) : (
                                <LogOut className="w-3 h-3 text-rose-600" />
                              )}
                              <span>Logout</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-neutral-700 bg-neutral-100 px-2 py-1 rounded border border-neutral-200">
                          {formatDuration(record.loginTime, record.logoutTime, record.date)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            record.status === 'LATE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              record.status === 'LATE' ? 'bg-amber-600' : 'bg-emerald-600'
                            }`}
                          ></span>
                          {record.status}
                        </span>
                      </td>

                      {/* Location & GPS */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="max-w-xs">
                          <div className="flex items-start gap-1 text-xs text-neutral-700">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-500" />
                            <span className="line-clamp-2 leading-relaxed">
                              {record.location?.address || 'Location Not Recorded'}
                            </span>
                          </div>
                          {record.location?.googleMapsUrl && (
                            <a
                              href={record.location.googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <span>View on Google Maps</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            record.source === 'EXTERNAL_ATTENDANCE_APP'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          {record.source === 'EXTERNAL_ATTENDANCE_APP' ? 'Attendance App' : 'System Login'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => handleOpenEmployeeDetails(record)}
                          className="bg-white hover:bg-blue-50 text-blue-700 border-neutral-200 hover:border-blue-300 font-semibold shadow-none"
                        >
                          View Logins
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* MONTHLY AGGREGATED VIEW */
        employees.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
            <Clock3 className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 text-sm font-semibold text-neutral-700">No employee logins for this month</p>
            <p className="mt-1 text-xs text-neutral-500">Successful employee sign-ins will appear here.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3 text-center">Days Present (This Month)</th>
                    <th className="px-4 py-3 text-center">Total Logins</th>
                    <th className="px-4 py-3 text-center">Total Logouts</th>
                    <th className="px-4 py-3">Latest Check-in</th>
                    <th className="px-4 py-3">Latest Check-out</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {employees.map((employee) => (
                    <tr
                      key={employee.userId}
                      tabIndex={0}
                      role="button"
                      onClick={() => setSelectedEmployee(employee)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') setSelectedEmployee(employee);
                      }}
                      className="cursor-pointer hover:bg-blue-50/50 focus:bg-blue-50/50 focus:outline-none transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {employee.latestSelfie ? (
                            <img
                              src={employee.latestSelfie}
                              alt={employee.name}
                              className="h-9 w-9 rounded-full object-cover border border-emerald-400"
                            />
                          ) : (
                            <Avatar name={employee.name} size="sm" />
                          )}
                          <div>
                            <div className="font-semibold text-neutral-900">{employee.name}</div>
                            <div className="text-xs text-neutral-500">
                              <span className="font-mono text-blue-600 font-semibold">{employee.employeeId || 'EMP'}</span> ·{' '}
                              {employee.role.replace(/_/g, ' ')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{employee.department || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                          {employee.daysPresent} Days Present
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-emerald-700">{employee.loginCount} Logins</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-amber-700">{employee.logoutCount} Logouts</td>
                      <td className="px-4 py-3 text-xs text-neutral-700 font-medium">
                        {formatDateTime(employee.latestLogin)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {employee.latestLogout && String(employee.latestLogout).toLowerCase() !== 'invalid date' ? (
                          <span className="text-neutral-700 font-medium">{formatDateTime(employee.latestLogout)}</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active Now
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedEmployee(employee);
                          }}
                        >
                          View details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* SlideOver Panel for Selected Employee */}
      <SlideOverPanel
        isOpen={selectedEmployee !== null}
        onClose={() => setSelectedEmployee(null)}
        title={selectedEmployee?.name || 'Employee Attendance & Login Details'}
        subtitle={
          selectedEmployee
            ? `${selectedEmployee.employeeId || selectedEmployee.email} · ${selectedEmployee.department}`
            : undefined
        }
        badge={
          selectedEmployee ? (
            <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase text-blue-700">
              {selectedEmployee.role.replace(/_/g, ' ')}
            </span>
          ) : undefined
        }
      >
        {selectedEmployee && (() => {
          const allEmployeeEvents = selectedEmployee.records.flatMap(getLoginEvents);
          const totalLogins = allEmployeeEvents.length;
          const totalLogouts = allEmployeeEvents.filter(
            (e) => Boolean(e.logoutTime) && String(e.logoutTime).toLowerCase() !== 'invalid date'
          ).length;
          const activeSessions = Math.max(0, totalLogins - totalLogouts);

          return (
            <div className="space-y-5">
              {/* Employee Summary Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-900 via-indigo-900 to-neutral-900 text-white shadow-md relative overflow-hidden">
                <div className="flex items-center gap-3.5 relative z-10">
                  {selectedEmployee.latestSelfie ? (
                    <img
                      src={selectedEmployee.latestSelfie}
                      alt={selectedEmployee.name}
                      className="h-14 w-14 rounded-full object-cover border-2 border-emerald-400 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() =>
                        setPreviewSelfie({
                          url: selectedEmployee.latestSelfie!,
                          name: selectedEmployee.name,
                          time: formatDateTime(selectedEmployee.latestLogin),
                        })
                      }
                      title="Click to enlarge photo"
                    />
                  ) : (
                    <Avatar name={selectedEmployee.name} size="lg" className="border-2 border-white/20" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-white truncate">{selectedEmployee.name}</h3>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30 font-bold">
                        {selectedEmployee.employeeId || 'EMP'}
                      </span>
                    </div>
                    <div className="text-xs text-blue-200 truncate mt-0.5">{selectedEmployee.email}</div>
                    {selectedEmployee.phone && (
                      <div className="text-[11px] text-blue-300 font-mono mt-0.5">{selectedEmployee.phone}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {/* Total Logins */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 shadow-sm">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                    <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Total Logins</span>
                  </div>
                  <div className="mt-1 text-2xl font-black text-emerald-950">{totalLogins}</div>
                  <div className="text-[10px] text-emerald-700 font-medium">Punch-ins recorded</div>
                </div>

                {/* Total Logouts */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 shadow-sm">
                  <div className="flex items-center gap-1.5 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                    <LogOut className="h-3.5 w-3.5 text-amber-600" />
                    <span>Total Logouts</span>
                  </div>
                  <div className="mt-1 text-2xl font-black text-amber-950">{totalLogouts}</div>
                  <div className="text-[10px] text-amber-700 font-medium">Punch-outs recorded</div>
                </div>

                {/* Days Present */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 shadow-sm">
                  <div className="flex items-center gap-1.5 text-blue-800 text-[10px] font-bold uppercase tracking-wider">
                    <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
                    <span>Days Present</span>
                  </div>
                  <div className="mt-1 text-2xl font-black text-blue-950">{selectedEmployee.daysPresent}</div>
                  <div className="text-[10px] text-blue-700 font-medium">Calendar days</div>
                </div>

                {/* Active Session Status */}
                <div className="rounded-xl border border-purple-200 bg-purple-50/80 p-3 shadow-sm">
                  <div className="flex items-center gap-1.5 text-purple-800 text-[10px] font-bold uppercase tracking-wider">
                    <Clock className="h-3.5 w-3.5 text-purple-600" />
                    <span>Status</span>
                  </div>
                  <div className="mt-1 text-sm font-black text-purple-950 flex items-center gap-1.5 pt-1">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        activeSessions > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'
                      }`}
                    />
                    <span>{activeSessions > 0 ? 'Active Now' : 'Signed Out'}</span>
                  </div>
                  <div className="text-[10px] text-purple-700 font-medium">
                    {activeSessions > 0 ? `${activeSessions} active session` : 'No active session'}
                  </div>
                </div>
              </div>

              {/* Day-by-Day Records List */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                    Day-Wise Login & Logout Timeline
                  </h4>
                  <span className="text-[11px] font-medium text-neutral-500">
                    {selectedEmployee.records.length} date records
                  </span>
                </div>

                {selectedEmployee.records.map((record) => {
                  const events = [...getLoginEvents(record)].sort(
                    (a, b) => new Date(a.loginTime).getTime() - new Date(b.loginTime).getTime()
                  );
                  const isDayLate = record.status === 'LATE';

                  return (
                    <section
                      key={record._id}
                      className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow"
                    >
                      {/* Date Heading & Status */}
                      <div className="flex items-center justify-between bg-neutral-50 px-4 py-3 border-b border-neutral-200">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-neutral-500" />
                          <span className="text-sm font-bold text-neutral-900">
                            {new Date(`${record.date}T12:00:00Z`).toLocaleDateString('en-IN', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              timeZone: 'Asia/Kolkata',
                            })}
                          </span>
                          <span className="font-mono text-xs text-neutral-400">({record.date})</span>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isDayLate
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {record.status}
                        </span>
                      </div>

                      {/* Selfie & Location Card */}
                      {record.selfieUrl && (
                        <div className="border-b border-neutral-100 p-4 bg-gradient-to-r from-emerald-50/40 to-blue-50/30 flex items-center gap-3.5">
                          <div
                            onClick={() =>
                              setPreviewSelfie({
                                url: record.selfieUrl!,
                                name: record.userName,
                                time: formatDateTime(record.loginTime, record.date),
                                location: record.location?.address,
                              })
                            }
                            className="relative group cursor-pointer h-16 w-16 shrink-0 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-sm"
                            title="Click to view full photo"
                          >
                            <img
                              src={record.selfieUrl}
                              alt="Punch Selfie"
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera className="h-4 w-4 text-white" />
                            </div>
                          </div>
                          <div className="text-xs space-y-1 min-w-0">
                            <div className="flex items-center gap-1.5 font-bold text-neutral-800">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span>Verified Attendance Selfie</span>
                            </div>
                            {record.location?.address && record.location.address !== 'N/A' && (
                              <div className="text-neutral-600 line-clamp-2 leading-relaxed flex items-start gap-1">
                                <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                                <span>{record.location.address}</span>
                              </div>
                            )}
                            {record.location?.googleMapsUrl && (
                              <a
                                href={record.location.googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline pt-0.5"
                              >
                                <span>View Map Pin</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Login and Logout Event Cards */}
                      <div className="divide-y divide-neutral-100 p-3 space-y-3">
                        {events.map((event, index) => {
                          const duration = formatDuration(event.loginTime, event.logoutTime, record.date);
                          const hasLogout =
                            Boolean(event.logoutTime) &&
                            String(event.logoutTime).toLowerCase() !== 'null' &&
                            String(event.logoutTime).toLowerCase() !== 'invalid date';

                          return (
                            <div
                              key={`${event.loginTime}-${index}`}
                              className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3.5 space-y-3"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-neutral-700 bg-neutral-200/80 px-2 py-0.5 rounded text-[11px]">
                                  Session #{index + 1}
                                </span>
                                <span
                                  className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                                    hasLogout
                                      ? 'bg-neutral-200 text-neutral-700'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                                  }`}
                                >
                                  {hasLogout ? `Duration: ${duration}` : '🟢 Currently Active'}
                                </span>
                              </div>

                              {/* 2 Big Cards: Login Time & Logout Time */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {/* Login Card */}
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5">
                                  <div className="flex items-center gap-1.5 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                                    <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>Login / Check-in Time</span>
                                  </div>
                                  <div className="mt-1 text-base font-extrabold text-emerald-950 font-mono">
                                    {formatExactTime(event.loginTime, record.date)}
                                  </div>
                                  <div className="text-[11px] text-emerald-700 mt-0.5">
                                    {formatDateTime(event.loginTime, record.date)}
                                  </div>
                                </div>

                                {/* Logout Card */}
                                <div
                                  className={`rounded-lg border p-2.5 ${
                                    hasLogout
                                      ? 'border-amber-200 bg-amber-50/70'
                                      : 'border-blue-200 bg-blue-50/70'
                                  }`}
                                >
                                  <div
                                    className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                                      hasLogout ? 'text-amber-800' : 'text-blue-800'
                                    }`}
                                  >
                                    <LogOut
                                      className={`h-3.5 w-3.5 ${hasLogout ? 'text-amber-600' : 'text-blue-600'}`}
                                    />
                                    <span>Logout / Check-out Time</span>
                                  </div>
                                  <div
                                    className={`mt-1 text-base font-extrabold font-mono ${
                                      hasLogout ? 'text-amber-950' : 'text-blue-950'
                                    }`}
                                  >
                                    {hasLogout ? formatExactTime(event.logoutTime, record.date) : 'Not Logged Out Yet'}
                                  </div>
                                  {hasLogout ? (
                                    <>
                                      <div className="text-[11px] text-amber-700 mt-0.5">
                                        {formatDateTime(event.logoutTime!, record.date)}
                                      </div>
                                      <div className="mt-1.5 flex items-center gap-1.5">
                                        {event.logoutBy === 'ADMIN' ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-mono">
                                            <Shield className="w-3 h-3 text-rose-600" />
                                            <span>Admin {event.logoutAdminName ? `(${event.logoutAdminName})` : ''}</span>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-mono">
                                            <User className="w-3 h-3 text-blue-600" />
                                            <span>Employee</span>
                                          </span>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="mt-1 flex items-center justify-between">
                                      <span className="text-[11px] text-blue-700">🟢 Session active</span>
                                      <button
                                        onClick={() => handleForceLogout(record)}
                                        disabled={loggingOutUserId === record.userId}
                                        className="px-2 py-1 text-[10px] font-bold rounded bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1 cursor-pointer"
                                      >
                                        <LogOut className="w-3 h-3" />
                                        <span>Force Logout</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Technical Details: Source / GPS / IP */}
                              {(event.ipAddress || event.userAgent) && (
                                <div className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-200/60 flex flex-wrap items-center gap-x-3 gap-y-1">
                                  {event.ipAddress && (
                                    <span>
                                      <strong className="text-neutral-600">Source:</strong> {event.ipAddress}
                                    </span>
                                  )}
                                  {event.userAgent && (
                                    <span className="truncate max-w-full">
                                      <strong className="text-neutral-600">Device/Note:</strong> {event.userAgent}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </SlideOverPanel>

      {/* Selfie Image Lightbox Preview Modal */}
      {previewSelfie && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewSelfie(null)}
        >
          <div
            className="relative max-w-lg w-full rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="font-bold text-neutral-900">{previewSelfie.name}</h3>
                <p className="text-xs text-neutral-500">{previewSelfie.time}</p>
              </div>
              <button
                onClick={() => setPreviewSelfie(null)}
                className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl bg-neutral-950 flex items-center justify-center">
              <img
                src={previewSelfie.url}
                alt="Enlarged Selfie"
                className="max-h-[65vh] w-auto object-contain"
              />
            </div>

            {previewSelfie.location && (
              <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-600">
                <MapPin className="h-4 w-4 flex-shrink-0 text-rose-500 mt-0.5" />
                <span>{previewSelfie.location}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
