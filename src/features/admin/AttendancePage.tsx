import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
  Trash2,
  Utensils,
  FileText,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { EmployeeMonthlyHistoryView } from './EmployeeMonthlyHistoryView';
import { WorkReportsTableView } from '../reports/WorkReportsTableView';
import { usersApi, UserDto } from './api/usersApi';


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

function resolveSelfieUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('data:image')) {
    return url;
  }
  if (url.includes('atendence-crm.vercel.app')) {
    // Avoid blocking requests to external Vercel server which hangs
    return '';
  }
  if (url.startsWith('/api/')) {
    const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '';
    if (apiBase && typeof apiBase === 'string' && apiBase.startsWith('http')) {
      try {
        const origin = new URL(apiBase).origin;
        return `${origin}${url}`;
      } catch {}
    }
    return url;
  }
  return url;
}

interface EmployeeAvatarBadgeProps {
  name: string;
  employeeId?: string;
  userId?: string;
  avatarUrl?: string;
  selfieUrl?: string;
  isActive?: boolean;
  isOnLunch?: boolean;
  onSelfieClick?: () => void;
}

function getInitials(name?: string, fallback = 'U'): string {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradientFromName(name?: string): string {
  const gradients = [
    'from-indigo-600 to-blue-700 text-white',
    'from-emerald-600 to-teal-700 text-white',
    'from-violet-600 to-purple-800 text-white',
    'from-amber-500 to-orange-600 text-white',
    'from-rose-500 to-pink-700 text-white',
    'from-cyan-600 to-blue-800 text-white',
    'from-teal-600 to-emerald-800 text-white',
    'from-fuchsia-600 to-rose-700 text-white',
  ];
  if (!name) return gradients[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % gradients.length;
  return gradients[idx];
}

export function EmployeeAvatarBadge({
  name,
  employeeId,
  avatarUrl,
  selfieUrl,
  isActive = false,
  isOnLunch = false,
  onSelfieClick,
}: EmployeeAvatarBadgeProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = getInitials(name);
  const gradient = getGradientFromName(name || employeeId);

  const cleanSelfie = resolveSelfieUrl(selfieUrl);
  const cleanAvatar = resolveSelfieUrl(avatarUrl);
  const candidateUrl = cleanSelfie || cleanAvatar;

  const hasImage = Boolean(candidateUrl && !imgFailed);

  return (
    <div className="relative shrink-0 group/avatar">
      <div
        onClick={hasImage && onSelfieClick ? onSelfieClick : undefined}
        className={`relative h-11 w-11 rounded-xl overflow-hidden shadow-sm transition-all duration-200 border-2 ${
          isActive
            ? 'border-emerald-500 ring-2 ring-emerald-100'
            : isOnLunch
            ? 'border-amber-400 ring-2 ring-amber-100'
            : 'border-slate-200'
        } ${onSelfieClick && hasImage ? 'cursor-pointer hover:scale-105' : ''}`}
        title={hasImage && onSelfieClick ? `Click to view selfie for ${name}` : name}
      >
        {hasImage ? (
          <>
            <img
              src={candidateUrl}
              alt={name}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
            {onSelfieClick && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                <Camera className="h-4 w-4 text-white" />
              </div>
            )}
          </>
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-xs tracking-wider shadow-inner select-none`}>
            {initials}
          </div>
        )}
      </div>

      {/* Real-time status indicator dot */}
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
          isActive
            ? 'bg-emerald-500 ring-1 ring-emerald-500/30'
            : isOnLunch
            ? 'bg-amber-500 ring-1 ring-amber-500/30'
            : 'bg-slate-300'
        }`}
        title={isActive ? 'Active Now' : isOnLunch ? 'On Lunch' : 'Concluded'}
      />
    </div>
  );
}

function parseToValidDate(value?: any, fallbackDateStr?: string): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) || value.getFullYear() < 2020 ? null : value;
  }
  const str = String(value).trim();
  if (
    !str ||
    str === '0' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined' ||
    str.toLowerCase() === 'invalid date'
  ) {
    return null;
  }

  // 1. Direct standard parse (e.g. ISO string "2026-10-04T08:47:09.752Z")
  const directDate = new Date(str);
  if (!isNaN(directDate.getTime()) && directDate.getFullYear() >= 2020) {
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
    return !isNaN(d.getTime()) && d.getFullYear() >= 2020 ? d : null;
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
    return !isNaN(d.getTime()) && d.getFullYear() >= 2020 ? d : null;
  }

  return null;
}

const getLoginEvents = (record: AttendanceRecord): AttendanceLoginEvent[] => {
  const sanitizeLogout = (val?: string, logTime?: string) => {
    if (!val || val.toLowerCase() === 'null' || val.toLowerCase() === 'undefined' || val.toLowerCase() === 'invalid date') {
      return undefined;
    }
    // If logout time is within 3 seconds of login time, employee hasn't logged out yet (Active session!)
    if (logTime) {
      const logD = parseToValidDate(logTime, record.date);
      const outD = parseToValidDate(val, record.date);
      if (logD && outD && Math.abs(outD.getTime() - logD.getTime()) <= 3000) {
        return undefined;
      }
    }
    return val;
  };

  const recLogout = sanitizeLogout(record.logoutTime, record.loginTime);

  if (record.loginEvents?.length) {
    const events = record.loginEvents.map((e) => ({
      ...e,
      logoutTime: sanitizeLogout(e.logoutTime, e.loginTime || record.loginTime),
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

function LiveAwayTimer({ startTime }: { startTime?: any }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const startMs = parseToValidDate(startTime)?.getTime() || new Date(startTime).getTime();
    if (isNaN(startMs)) return;

    const tick = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setSeconds(diff);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return <span>{`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`}</span>;
}

export function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'punches' | 'monthly-history' | 'summary' | 'work-reports'>('punches');
  const [month, setMonth] = useState(currentMonthValue);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [systemUsers, setSystemUsers] = useState<UserDto[]>([]);
  const [selectedEmployeeForMonth, setSelectedEmployeeForMonth] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeMonthSummary | null>(null);
  const [previewSelfie, setPreviewSelfie] = useState<{ url: string; name: string; time: string; location?: string } | null>(null);
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'month' | 'all' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isShowingRecentFallback, setIsShowingRecentFallback] = useState(false);
  const [loggingOutUserId, setLoggingOutUserId] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const { addToast } = useUIStore();

  const loadAttendance = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const todayDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());

      let queryOptions: any = {
        page: currentPage,
        limit: pageSize,
      };

      if (activeTab === 'summary') {
        const [year, monthNumber] = month.split('-').map(Number);
        const lastDay = new Date(year, monthNumber, 0).getDate();
        queryOptions.startDate = `${month}-01`;
        queryOptions.endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
      } else {
        if (dateFilterMode === 'today') {
          queryOptions.date = todayDateStr;
        } else if (dateFilterMode === 'month') {
          const [curY, curM] = todayDateStr.split('-');
          const lastDay = new Date(Number(curY), Number(curM), 0).getDate();
          queryOptions.startDate = `${curY}-${curM}-01`;
          queryOptions.endDate = `${curY}-${curM}-${String(lastDay).padStart(2, '0')}`;
        } else if (dateFilterMode === 'custom') {
          queryOptions.date = customDate;
        } else if (dateFilterMode === 'all') {
          queryOptions.date = 'ALL';
        }
      }

      const response = await attendanceApi.getAttendance(queryOptions);

      let fetchedRecords = response.records || [];
      let isFallback = false;

      // If Today was selected but Today has 0 punches yet (e.g. before 10 AM shift start or past midnight),
      // seamlessly load all recent records so the admin immediately sees the staff attendance data!
      if (dateFilterMode === 'today' && fetchedRecords.length === 0) {
        try {
          const fallbackResp = await attendanceApi.getAttendance({
            page: 1,
            limit: pageSize,
            date: 'ALL',
          });
          if (fallbackResp.records && fallbackResp.records.length > 0) {
            fetchedRecords = fallbackResp.records;
            isFallback = true;
          }
        } catch {
          // ignore fallback error
        }
      }

      setIsShowingRecentFallback(isFallback);
      setRecords(fetchedRecords);
      setTotalRecords(isFallback ? fetchedRecords.length : (response.total || fetchedRecords.length));
      setTotalPages(Math.max(1, Math.ceil((isFallback ? fetchedRecords.length : (response.total || fetchedRecords.length)) / pageSize)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load employee attendance.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, month, dateFilterMode, customDate, currentPage, pageSize]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    usersApi.getUsers().then((users) => {
      if (Array.isArray(users)) setSystemUsers(users);
    }).catch(() => {});
  }, []);

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

  const handleForceLogout = async (record: AttendanceRecord | { userId: string; name: string }) => {
    const empName = 'userName' in record ? record.userName : record.name;
    if (!window.confirm(`Are you sure you want to remotely logout ${empName}?\nTheir dashboard session will be closed immediately and punch-out will be recorded in Attendance as 'ADMIN'.`)) {
      return;
    }
    try {
      setLoggingOutUserId(record.userId);
      const res = await attendanceApi.forceLogout(record.userId);
      addToast({
        type: 'success',
        title: `${empName} Logged Out`,
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

  const handleClearAllAttendance = async () => {
    try {
      setIsClearing(true);
      const res = await attendanceApi.clearAll();
      setRecords([]);
      setSelectedEmployee(null);
      setIsClearModalOpen(false);
      addToast({
        type: 'success',
        title: 'Attendance Records Cleared',
        message: res.message || 'All attendance records successfully wiped.',
      });
      await loadAttendance();
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Clear Failed',
        message: err?.message || 'Could not clear attendance records.',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteSingleRecord = async (recordId: string, empName: string) => {
    if (!window.confirm(`Delete attendance record for ${empName}?`)) return;
    try {
      setDeletingRecordId(recordId);
      await attendanceApi.deleteRecord(recordId);
      setRecords((prev) => prev.filter((r) => r._id !== recordId));
      addToast({
        type: 'success',
        title: 'Record Removed',
        message: `Attendance record for ${empName} has been deleted.`,
      });
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Delete Failed',
        message: err?.message || 'Could not delete attendance record.',
      });
    } finally {
      setDeletingRecordId(null);
    }
  };


  const employees = useMemo(() => {
    const byUser = new Map<string, EmployeeMonthSummary>();
    for (const record of records) {
      const existing = byUser.get(record.userId);
      const hasRealSelfie = Boolean(record.selfieUrl) && record.selfieUrl!.length > 10;
      if (existing) {
        existing.records.push(record);
        if ((!existing.latestSelfie || existing.latestSelfie.length < 10) && hasRealSelfie) {
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
        latestSelfie: hasRealSelfie ? record.selfieUrl : undefined,
      });
    }

    return Array.from(byUser.values())
      .map((employee) => {
        const allEvents = employee.records.flatMap(getLoginEvents);
        const logoutEvents = allEvents.filter(
          (e) => {
            if (!e.logoutTime || String(e.logoutTime).toLowerCase() === 'invalid date') return false;
            const logD = parseToValidDate(e.loginTime, employee.records[0]?.date);
            const outD = parseToValidDate(e.logoutTime, employee.records[0]?.date);
            return !logD || !outD || Math.abs(outD.getTime() - logD.getTime()) > 3000;
          }
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

        // Find the most recent non-empty real camera selfie from any record
        const bestSelfie = employee.records.find(
          (r) => Boolean(r.selfieUrl) && r.selfieUrl!.length > 10
        )?.selfieUrl;

        return {
          ...employee,
          latestSelfie: bestSelfie || employee.latestSelfie,
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
          records: employee.records.sort((a, b) => {
            const timeA = parseToValidDate(a.loginTime, a.date)?.getTime() || 0;
            const timeB = parseToValidDate(b.loginTime, b.date)?.getTime() || 0;
            return timeB - timeA;
          }),
        };
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [records]);

  const availableEmployeesForHistory = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        employeeId?: string;
        department?: string;
        role?: string;
        avatarUrl?: string;
        latestSelfie?: string;
      }
    >();
    for (const emp of employees) {
      map.set(emp.userId, {
        userId: emp.userId,
        name: emp.name,
        email: emp.email,
        employeeId: emp.employeeId,
        department: emp.department,
        role: emp.role,
        latestSelfie: emp.latestSelfie,
      });
    }
    for (const u of systemUsers) {
      const existing = map.get(u.id);
      if (!existing) {
        map.set(u.id, {
          userId: u.id,
          name: u.name,
          email: u.email,
          employeeId: u.employeeId,
          department: u.department,
          role: u.role,
          avatarUrl: u.avatarUrl,
        });
      } else {
        if (!existing.avatarUrl) existing.avatarUrl = u.avatarUrl;
        if (!existing.employeeId) existing.employeeId = u.employeeId;
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [employees, systemUsers]);

  const handleOpenEmployeeMonthlyHistory = (userId: string) => {
    setSelectedEmployeeForMonth(userId);
    setActiveTab('monthly-history');
  };

  // Filtered punch records for the live feed - guarantees single row per employee per day
  const filteredPunchRecords = useMemo(() => {
    const seen = new Set<string>();
    const unique: AttendanceRecord[] = [];

    for (const r of records) {
      const key = `${r.userId || r.employeeId || r.userName}_${r.date}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const matchesSearch =
        !searchQuery.trim() ||
        (r.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.location?.address || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      if (matchesSearch && matchesStatus) {
        unique.push(r);
      }
    }

    return unique;
  }, [records, searchQuery, statusFilter]);

  const handleOpenEmployeeDetails = useCallback(
    (record: AttendanceRecord | EmployeeMonthSummary) => {
      if ('records' in record && Array.isArray((record as EmployeeMonthSummary).records)) {
        setSelectedEmployee(record as EmployeeMonthSummary);
        return;
      }
      const rec = record as AttendanceRecord;
      const found = employees.find(
        (e) => e.userId === rec.userId || (rec.userName && (e.name || '').toLowerCase() === rec.userName.toLowerCase())
      );
      if (found) {
        setSelectedEmployee(found);
      } else {
        const userRecords = records.filter(
          (r) => r.userId === rec.userId || (rec.userName && (r.userName || '').toLowerCase() === rec.userName.toLowerCase())
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
          records: userRecords.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
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
            onClick={() => setIsClearModalOpen(true)}
            icon={<Trash2 className="h-4 w-4 text-rose-600" />}
            className="border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold shadow-2xs"
            title="Delete all attendance records"
          >
            Clear Records
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
            value={availableEmployeesForHistory.length || employees.length}
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
            onClick={() => setActiveTab('monthly-history')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === 'monthly-history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Utensils className="h-4 w-4 text-amber-600" />
            <span>Employee Full History & Lunch (मासिक व लंच इतिहास)</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 font-bold">
              Full Month
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

          <button
            onClick={() => setActiveTab('work-reports')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === 'work-reports'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <FileText className="h-4 w-4 text-indigo-600" />
            <span>Daily Work Reports (दैनिक कार्य रिपोर्ट)</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800 font-bold">
              Reports DB
            </span>
          </button>
        </div>

        {activeTab === 'punches' && (
          <div className="flex flex-wrap items-center gap-2 pb-2">
            {/* Quick Date Range Filter */}
            <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('today');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition ${
                  dateFilterMode === 'today'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Today (आज)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('month');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition ${
                  dateFilterMode === 'month'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('all');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition ${
                  dateFilterMode === 'all'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                All Records
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('custom');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition ${
                  dateFilterMode === 'custom'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Pick Date
              </button>
            </div>

            {dateFilterMode === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs outline-none focus:border-blue-500 font-medium"
              />
            )}

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search employee, ID, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 rounded-lg border border-neutral-300 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-500"
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
          <div className="rounded-2xl border border-neutral-200/90 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 border border-blue-100 shadow-2xs">
              <Clock3 className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">No Attendance Records for Selected Filter</h3>
            <p className="mt-1 text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
              Is filter ke liye koi punch-in record nahi mila. Shift check-in start hone par live records yaha stream honge. Pichhle records dekhne ke liye neeche buttons click karein.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDateFilterMode('month');
                  setCurrentPage(1);
                }}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 font-semibold"
              >
                📅 View This Month (इस महीने का डेटा)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDateFilterMode('all');
                  setCurrentPage(1);
                }}
                className="font-semibold text-neutral-700"
              >
                📋 View All Records (सभी रिकॉर्ड्स)
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                icon={<RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />}
                onClick={() => void handleSyncNow()}
                disabled={isSyncing}
              >
                {isSyncing ? 'Syncing...' : 'Live Sync Attendance App'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {isShowingRecentFallback && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>Aaj (Today)</strong> ka punch-in abhi shuru nahi hua hai (Standard shift 10:00 AM). Pichhle active attendance records neeche display ho rahe hain:
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterMode('month');
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
                  >
                    View This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterMode('all');
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white text-blue-800 border border-blue-300 font-bold hover:bg-blue-50 transition"
                  >
                    View All Records
                  </button>
                </div>
              </div>
            )}
            <div className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-sm">
            <div className="overflow-x-auto max-h-[750px] relative">
              <table className="w-full min-w-[1100px] text-left text-xs text-neutral-700">
                <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50/95 text-[11px] font-bold uppercase tracking-wider text-neutral-500 shadow-2xs">
                  <tr>
                    <th className="px-4 py-3.5">Employee & Identity</th>
                    <th className="px-4 py-3.5">Punch Date</th>
                    <th className="px-4 py-3.5">Punch In</th>
                    <th className="px-4 py-3.5">Punch Out / Actor</th>
                    <th className="px-4 py-3.5">Shift Duration</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">GPS Location</th>
                    <th className="px-4 py-3.5">Source</th>
                    <th className="px-4 py-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredPunchRecords.map((record) => (
                    <tr
                      key={record._id}
                      onClick={() => handleOpenEmployeeDetails(record)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Unified Employee & Photo Column */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatarBadge
                            name={record.userName}
                            employeeId={record.employeeId}
                            userId={record.userId}
                            avatarUrl={systemUsers.find((u) => u.id === record.userId)?.avatarUrl}
                            selfieUrl={record.selfieUrl}
                            isActive={!record.logoutTime || String(record.logoutTime).toLowerCase() === 'invalid date'}
                            isOnLunch={Boolean(record.isOnLunch)}
                            onSelfieClick={() => {
                              if (record.selfieUrl && record.selfieUrl.length > 10) {
                                setPreviewSelfie({
                                  url: resolveSelfieUrl(record.selfieUrl),
                                  name: record.userName,
                                  time: formatDateTime(record.loginTime, record.date),
                                  location: record.location?.address,
                                });
                              }
                            }}
                          />

                          <div className="min-w-0">
                            <div className="font-bold text-neutral-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5 truncate">
                              <span className="truncate text-sm">{record.userName}</span>
                              <span className="text-[10px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                ↗
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded text-[11px]">
                                {record.employeeId || 'EMP'}
                              </span>
                              <span className="text-neutral-300">·</span>
                              <span className="truncate text-[11px] text-neutral-600 font-medium">
                                {record.department || 'Sales & BD'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Punch Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-neutral-900 text-xs">
                          {new Date(`${record.date}T12:00:00Z`).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'Asia/Kolkata',
                          })}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400 mt-0.5">{record.date}</div>
                      </td>

                      {/* Login Timing */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-mono font-bold text-xs text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 shadow-2xs">
                          <LogIn className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{formatExactTime(record.loginTime, record.date)}</span>
                        </div>
                      </td>

                      {/* Logout Timing & Away Duration Timer */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {record.logoutTime &&
                        String(record.logoutTime).toLowerCase() !== 'invalid date' &&
                        (() => {
                          const logD = parseToValidDate(record.loginTime, record.date);
                          const outD = parseToValidDate(record.logoutTime, record.date);
                          return !logD || !outD || Math.abs(outD.getTime() - logD.getTime()) > 3000;
                        })() ? (
                          <div className="flex flex-col gap-1 items-start">
                            <div className="inline-flex items-center gap-1.5 font-mono font-bold text-xs text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80 shadow-2xs">
                              <LogOut className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              <span>{formatExactTime(record.logoutTime, record.date)}</span>
                            </div>
                            {record.logoutBy === 'ADMIN' ? (
                              <div className="flex flex-col gap-1 items-start">
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-mono shadow-2xs"
                                  title={`Remotely punched out by ${record.adminLogoutBy || record.logoutAdminName || 'Admin'}`}
                                >
                                  <Shield className="w-3 h-3 text-rose-600 shrink-0" />
                                  <span>Admin {record.adminLogoutBy || record.logoutAdminName ? `(${record.adminLogoutBy || record.logoutAdminName})` : ''}</span>
                                </span>
                                {(record.isAwayPending || !record.adminLogoutReLoginAt) && (
                                  <span
                                    className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-mono animate-pulse"
                                    title="Timer active: calculating time until employee logs in again"
                                  >
                                    <Clock className="w-3 h-3 text-amber-700 animate-spin" />
                                    <span>Away: <LiveAwayTimer startTime={record.adminLogoutAt || record.logoutTime} /></span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono shadow-2xs">
                                <User className="w-3 h-3 text-blue-600 shrink-0" />
                                <span>Employee</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 font-semibold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Active</span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleForceLogout(record);
                                }}
                                disabled={loggingOutUserId === record.userId}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Remotely logout employee & record attendance punch-out as Admin"
                              >
                                {loggingOutUserId === record.userId ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                ) : (
                                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                                )}
                                <span>Logout</span>
                              </button>
                            </div>
                            {Boolean(record.totalAwayDurationSeconds || record.awayDurationFormatted) && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 font-mono shadow-2xs"
                                title={`Total away duration recorded during Admin Logout: ${record.awayDurationFormatted}`}
                              >
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Away Time: {record.awayDurationFormatted}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-neutral-800 bg-neutral-100 px-2.5 py-1 rounded-md border border-neutral-200 shadow-2xs">
                          {formatDuration(record.loginTime, record.logoutTime, record.date)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            record.status === 'LATE'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              record.status === 'LATE' ? 'bg-amber-600' : 'bg-emerald-600'
                            }`}
                          />
                          {record.status}
                        </span>
                      </td>

                      {/* Location & GPS */}
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="max-w-[200px]">
                          <div className="flex items-start gap-1.5 text-xs text-neutral-800">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                            <span className="truncate leading-tight font-medium" title={record.location?.address}>
                              {record.location?.address || 'Location Not Recorded'}
                            </span>
                          </div>
                          {record.location?.googleMapsUrl && (
                            <a
                              href={record.location.googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline ml-5"
                            >
                              <span>Google Maps</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            record.source === 'EXTERNAL_ATTENDANCE_APP'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                          }`}
                        >
                          {record.source === 'EXTERNAL_ATTENDANCE_APP' ? 'Attendance App' : 'System Login'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => handleOpenEmployeeMonthlyHistory(record.userId)}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 font-bold shadow-2xs flex items-center gap-1"
                            title="View employee full month attendance and lunch history"
                          >
                            <Utensils className="w-3 h-3 text-amber-600" />
                            <span>Month & Lunch</span>
                          </Button>
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => handleOpenEmployeeDetails(record)}
                            className="bg-white hover:bg-blue-50 text-blue-700 border-neutral-200 hover:border-blue-300 font-semibold shadow-2xs"
                          >
                            Details
                          </Button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteSingleRecord(record._id, record.userName)}
                            disabled={deletingRecordId === record._id}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete this attendance record"
                          >
                            {deletingRecordId === record._id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50/80 px-4 py-3 text-xs text-neutral-600">
              <div className="flex items-center gap-2">
                <span>
                  Showing <span className="font-bold text-neutral-900">{filteredPunchRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
                  <span className="font-bold text-neutral-900">{Math.min(currentPage * pageSize, totalRecords || filteredPunchRecords.length)}</span> of{' '}
                  <span className="font-bold text-neutral-900">{totalRecords || filteredPunchRecords.length}</span> records
                </span>
                <span className="text-neutral-300">|</span>
                <div className="flex items-center gap-1.5">
                  <span>Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded border border-neutral-300 bg-white px-2 py-0.5 text-xs outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="xs"
                  variant="secondary"
                  disabled={currentPage <= 1 || isLoading}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
                >
                  Previous
                </Button>
                <span className="px-2 font-mono font-bold text-neutral-800">
                  Page {currentPage} of {Math.max(1, totalPages)}
                </span>
                <Button
                  size="xs"
                  variant="secondary"
                  disabled={currentPage >= totalPages || isLoading}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )
      ) : activeTab === 'monthly-history' ? (
        <EmployeeMonthlyHistoryView
          availableEmployees={availableEmployeesForHistory}
          preselectedUserId={selectedEmployeeForMonth}
          onPreviewSelfie={(selfie) => setPreviewSelfie(selfie)}
        />
      ) : activeTab === 'work-reports' ? (
        <WorkReportsTableView />
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
                <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50/95 text-[11px] font-bold uppercase tracking-wider text-neutral-500 shadow-2xs">
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
                              {(employee.role || '').replace(/_/g, ' ')}
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
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenEmployeeMonthlyHistory(employee.userId);
                            }}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 font-bold"
                          >
                            <Utensils className="w-3 h-3 text-amber-600 mr-1" />
                            Month & Lunch
                          </Button>
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
                        </div>
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
              {(selectedEmployee.role || '').replace(/_/g, ' ')}
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

              {/* Quick Actions Bar */}
              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {activeSessions > 0 && (
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => void handleForceLogout(selectedEmployee)}
                      disabled={loggingOutUserId === selectedEmployee.userId}
                      icon={loggingOutUserId === selectedEmployee.userId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                    >
                      Remote Logout & Punch-Out
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      const empId = selectedEmployee.userId;
                      setSelectedEmployee(null);
                      handleOpenEmployeeMonthlyHistory(empId);
                    }}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 font-bold"
                    icon={<Utensils className="w-3.5 h-3.5 text-amber-600" />}
                  >
                    Full Month History & Lunch (मासिक व लंच)
                  </Button>
                  <Link
                    to={`/leads?search=${encodeURIComponent(selectedEmployee.name)}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition shadow-2xs"
                  >
                    <span>View Assigned Leads</span>
                  </Link>
                  <Link
                    to={`/employees?search=${encodeURIComponent(selectedEmployee.name)}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-200 transition shadow-2xs"
                  >
                    <span>Staff Profile & Actions</span>
                  </Link>
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
                      {record.selfieUrl && record.selfieUrl.length > 10 && !record.selfieUrl.includes('image/svg+xml') && (
                        <div className="border-b border-neutral-100 p-4 bg-gradient-to-r from-emerald-50/40 to-blue-50/30 flex items-center gap-3.5">
                          <div
                            onClick={() =>
                              setPreviewSelfie({
                                url: resolveSelfieUrl(record.selfieUrl),
                                name: record.userName,
                                time: formatDateTime(record.loginTime, record.date),
                                location: record.location?.address,
                              })
                            }
                            className="relative group cursor-pointer h-16 w-16 shrink-0 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-sm"
                            title="Click to view full photo"
                          >
                            <img
                              src={resolveSelfieUrl(record.selfieUrl)}
                              alt="Punch Selfie"
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
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

                      {/* Lunch Breaks Section for this Day */}
                      {((record.lunchBreaks && record.lunchBreaks.length > 0) || record.totalLunchDurationSeconds) && (
                        <div className="border-b border-amber-200/80 p-3 bg-amber-50/70 space-y-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-bold text-amber-950">
                              <Utensils className="w-4 h-4 text-amber-600" />
                              <span>Lunch Timing & Breaks (लंच का समय):</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded font-bold">
                                Sched: 1:00 PM · 20m Limit
                              </span>
                              {record.lunchDurationFormatted && (
                                <span className="font-mono font-black text-amber-950 bg-amber-200 px-2.5 py-0.5 rounded text-[11px] border border-amber-300">
                                  Total: {record.lunchDurationFormatted}
                                </span>
                              )}
                            </div>
                          </div>
                          {record.lunchBreaks && record.lunchBreaks.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 font-mono text-[11px]">
                              {record.lunchBreaks.map((lb, idx) => {
                                const sD = parseToValidDate(lb.startTime, record.date);
                                const eD = parseToValidDate(lb.endTime, record.date);
                                const isOngoing = !eD || lb.status === 'ONGOING';
                                const sec = lb.durationSeconds || (sD && eD ? Math.max(0, Math.round((eD.getTime() - sD.getTime()) / 1000)) : 0);
                                const isOverstay = sec > 1200;
                                return (
                                  <div key={idx} className={`p-2 rounded-lg border ${isOverstay ? 'bg-amber-100/70 border-amber-300' : 'bg-white border-amber-200'}`}>
                                    <div className="flex items-center justify-between font-bold text-neutral-900">
                                      <span>Lunch Break #{idx + 1}</span>
                                      <span className={isOverstay ? 'text-amber-900' : 'text-emerald-800'}>
                                        {formatDuration(lb.startTime, lb.endTime, record.date)}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-neutral-600 mt-1 flex items-center justify-between">
                                      <span>Start: {formatExactTime(lb.startTime, record.date)}</span>
                                      <span>Return: {isOngoing ? 'Ongoing Break' : formatExactTime(lb.endTime, record.date)}</span>
                                    </div>
                                    <div className="mt-1 text-[10px] font-sans font-semibold">
                                      {isOngoing ? (
                                        <span className="text-amber-800 animate-pulse">⏳ Break In Progress</span>
                                      ) : isOverstay ? (
                                        <span className="text-amber-900">⚠️ Exceeded 20 min rule</span>
                                      ) : (
                                        <span className="text-emerald-700">✅ On time (Within 20m)</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      )}

                      {/* Login and Logout Event Cards */}
                      <div className="divide-y divide-neutral-100 p-3 space-y-3">
                        {events.map((event, index) => {
                          const parsedOut = parseToValidDate(event.logoutTime, record.date);
                          const parsedIn = parseToValidDate(event.loginTime, record.date);
                          const isSameAsLogin = Boolean(parsedIn && parsedOut && Math.abs(parsedOut.getTime() - parsedIn.getTime()) <= 3000);

                          const hasLogout = Boolean(parsedOut && parsedOut.getFullYear() >= 2020 && !isSameAsLogin);

                          const duration = hasLogout ? formatDuration(event.loginTime, event.logoutTime, record.date) : 'Currently Active';

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
                                      {/* Away / Admin Logout Duration Detail */}
                                      {event.logoutBy === 'ADMIN' && (
                                        <div className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold flex items-center gap-1 text-amber-900">
                                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                                              <span>Away / Logout Duration:</span>
                                            </span>
                                            {event.awayDurationFormatted ? (
                                              <span className="font-mono font-black text-amber-950 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                                                ⏱️ {event.awayDurationFormatted}
                                              </span>
                                            ) : (
                                              <span className="font-mono font-black text-rose-900 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 animate-pulse">
                                                ⏱️ <LiveAwayTimer startTime={event.logoutTime} />
                                              </span>
                                            )}
                                          </div>
                                          {event.reLoginTime && (
                                            <div className="text-[11px] text-amber-800 flex items-center justify-between pt-1 border-t border-amber-200/60 font-medium">
                                              <span>Re-login Check-in:</span>
                                              <span className="font-mono">{formatDateTime(event.reLoginTime, record.date)}</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
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

      {/* Selfie Image Lightbox Preview Modal (No background blur) */}
      {previewSelfie && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-200"
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

      {/* Clear All Attendance Confirmation Modal (No blur) */}
      {isClearModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 flex items-center justify-center animate-in fade-in"
          onClick={() => !isClearing && setIsClearModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-md w-full p-6 space-y-4 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Delete All Attendance Records</h3>
                <p className="text-xs text-neutral-500">Wipe entire attendance history from database.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-lg border border-neutral-200 leading-relaxed">
              Are you sure you want to permanently clear all attendance entries? 
              This will remove all punch-in, punch-out, duration, and selfie records. 
              New attendances will start fresh from today.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsClearModalOpen(false)}
                disabled={isClearing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                onClick={() => void handleClearAllAttendance()}
                disabled={isClearing}
              >
                {isClearing ? 'Clearing...' : 'Confirm Clear All'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

