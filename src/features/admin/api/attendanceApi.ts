import { apiClient } from '@/lib/apiClient';

export interface AttendanceLunchBreak {
  startTime: string;
  endTime?: string;
  startTimeFormatted?: string;
  endTimeFormatted?: string;
  durationSeconds?: number;
  durationFormatted?: string;
  notes?: string;
  status?: 'ONGOING' | 'COMPLETED';
}

export interface AttendanceLoginEvent {
  loginTime: string;
  logoutTime?: string;
  logoutBy?: 'ADMIN' | 'EMPLOYEE' | 'SYSTEM';
  logoutAdminName?: string;
  ipAddress?: string;
  userAgent?: string;
  awayDurationFormatted?: string;
  reLoginTime?: string;
  loginTimeFormatted?: string;
  logoutTimeFormatted?: string;
}

export interface AttendanceRecord {
  _id: string;
  organizationId: string;
  userId: string;
  employeeId?: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  role: string;
  department: string;
  date: string;
  loginTime: string;
  lastActiveAt: string;
  logoutTime?: string;
  logoutBy?: 'ADMIN' | 'EMPLOYEE' | 'SYSTEM';
  logoutAdminName?: string;
  adminLogoutBy?: string;
  adminLogoutAt?: string;
  adminLogoutReLoginAt?: string;
  isAwayPending?: boolean;
  totalAwayDurationSeconds?: number;
  awayDurationFormatted?: string;
  lunchBreaks?: AttendanceLunchBreak[];
  totalLunchDurationSeconds?: number;
  lunchDurationFormatted?: string;
  isOnLunch?: boolean;
  currentLunchStart?: string;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
  selfieUrl?: string;
  location?: {
    address?: string;
    lat?: number;
    lng?: number;
    accuracy?: number;
    googleMapsUrl?: string;
  };
  source?: 'SYSTEM_LOGIN' | 'EXTERNAL_ATTENDANCE_APP';
  externalRecordId?: string;
  ipAddress?: string;
  userAgent?: string;
  loginEvents?: AttendanceLoginEvent[];
}

export interface AttendanceListResponse {
  records: AttendanceRecord[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  summary: {
    totalEmployees: number;
    presentToday: number;
    lateToday: number;
    absentToday: number;
    attendanceRate: number;
    selectedDate: string;
  };
}

export interface EmployeeMonthDayHistory {
  date: string;
  dayNumber: number;
  dayName: string;
  dayShortName: string;
  isWeekend: boolean;
  isToday: boolean;
  isFuture: boolean;
  present: boolean;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'ABSENT' | 'WEEKEND' | 'UPCOMING';
  loginTime: string | null;
  loginTimeFormatted: string | null;
  logoutTime: string | null;
  logoutTimeFormatted: string | null;
  logoutBy?: 'ADMIN' | 'EMPLOYEE' | 'SYSTEM';
  logoutAdminName?: string;
  adminLogoutBy?: string;
  shiftDurationSeconds: number;
  shiftDurationFormatted: string;
  isOnLunch: boolean;
  lunchBreaks: AttendanceLunchBreak[];
  lunchBreaksCount: number;
  totalLunchDurationSeconds: number;
  totalLunchDurationFormatted: string;
  selfieUrl?: string;
  location?: {
    address?: string;
    lat?: number;
    lng?: number;
    googleMapsUrl?: string;
  };
  source?: string;
  loginEvents: AttendanceLoginEvent[];
  recordId?: string;
  workReport?: string;
  workCategory?: string;
  developmentChanges?: string;
  taskSummary?: string;
  punchOutImageUrl?: string;
  logoutLocation?: string;
}

export interface EmployeeMonthlyHistoryResponse {
  employee: {
    userId: string;
    name: string;
    email: string;
    phone?: string;
    employeeId?: string;
    role: string;
    department: string;
    avatarUrl?: string;
    latestSelfie?: string;
  };
  month: string;
  monthLabel: string;
  summary: {
    totalDaysInMonth: number;
    workingDaysInMonth: number;
    workingDaysElapsed: number;
    presentDays: number;
    fullDays?: number;
    presentDates: string[];
    absentDays: number;
    lateDays: number;
    halfDays: number;
    onLeaveDays: number;
    attendancePercentage: number;
    totalWorkingSeconds: number;
    totalWorkingFormatted: string;
    totalLunchBreaksCount: number;
    totalLunchSeconds: number;
    totalLunchFormatted: string;
    avgDailyLunchFormatted: string;
    avgLoginTime: string;
    earliestLogin: string;
    latestLogin: string;
    currentlyActive: boolean;
    currentlyOnLunch: boolean;
  };
  days: EmployeeMonthDayHistory[];
}

export interface DailyReportTimelineItem {
  time: string;
  rawTime: string;
  type: 'CHECK_IN' | 'CHECK_OUT' | 'LUNCH_START' | 'LUNCH_END' | 'CALL' | 'LEAD' | 'TASK' | 'SESSION';
  title: string;
  description: string;
  badge?: string;
  badgeColor?: 'emerald' | 'amber' | 'blue' | 'purple' | 'rose' | 'neutral';
  metadata?: any;
  workReport?: string;
  workCategory?: string;
  developmentChanges?: string;
  punchOutImageUrl?: string;
}

export interface EmployeeDailyReportResponse {
  employee: {
    userId: string;
    name: string;
    email: string;
    phone?: string;
    employeeId?: string;
    role: string;
    department: string;
    avatarUrl?: string;
  };
  date: string;
  attendance: {
    status: string;
    isHalfDay: boolean;
    loginTime: string | null;
    loginTimeFormatted: string | null;
    logoutTime: string | null;
    logoutTimeFormatted: string | null;
    shiftDurationFormatted: string;
    shiftDurationSeconds: number;
    isOnLunch: boolean;
    totalLunchDurationSeconds: number;
    totalLunchFormatted: string;
    isLunchOverstay: boolean;
    lunchOverstayFormatted: string | null;
    lunchBreaks: Array<{
      startTimeFormatted: string;
      endTimeFormatted: string;
      durationFormatted: string;
      durationSeconds: number;
      isOverstay: boolean;
      overstayFormatted: string | null;
    }>;
    sessions: Array<{
      sessionNumber: number;
      loginTimeFormatted: string;
      logoutTimeFormatted: string;
      ipAddress?: string;
      logoutBy?: string;
    }>;
    selfieUrl?: string;
    location?: string;
    workReport?: string;
    workCategory?: string;
    developmentChanges?: string;
    taskSummary?: string;
    reportSubmittedAt?: string;
    punchOutImageUrl?: string;
    logoutLocation?: string;
  } | null;
  summary: {
    totalCalls: number;
    connectedCalls: number;
    totalCallDurationFormatted: string;
    totalLeadsHandled: number;
    totalTasksCompleted: number;
    totalTimelineEvents: number;
  };
  timeline: DailyReportTimelineItem[];
}

export interface LunchStatusResponse {
  isOnLunch: boolean;
  currentLunchStart?: string;
  lunchBreaks: AttendanceLunchBreak[];
  totalLunchDurationSeconds: number;
  lunchDurationFormatted: string;
}

export const attendanceApi = {
  getAttendance: (
    options?: {
      startDate?: string;
      endDate?: string;
      date?: string;
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    } | string,
    endDate?: string,
    date?: string
  ): Promise<AttendanceListResponse> => {
    const params = new URLSearchParams();

    if (typeof options === 'object' && options !== null) {
      if (options.startDate && options.endDate) {
        params.set('startDate', options.startDate);
        params.set('endDate', options.endDate);
      } else if (options.date) {
        params.set('date', options.date);
      }
      if (options.page) params.set('page', String(options.page));
      if (options.limit) params.set('limit', String(options.limit));
      if (options.search) params.set('search', options.search);
      if (options.status && options.status !== 'ALL') params.set('status', options.status);
    } else {
      const startDate = typeof options === 'string' ? options : undefined;
      if (startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      } else if (date) {
        params.set('date', date);
      }
    }

    if (!params.has('page')) params.set('page', '1');
    if (!params.has('limit')) params.set('limit', '50');

    return apiClient.get<AttendanceListResponse>(`/attendance?${params.toString()}`);
  },

  syncExternal: (): Promise<{ success: boolean; message: string; syncedCount: number }> => {
    return apiClient.post<{ success: boolean; message: string; syncedCount: number }>('/attendance/sync', {});
  },

  forceLogout: (userId: string): Promise<{ success: boolean; message: string; record?: any }> => {
    return apiClient.post<{ success: boolean; message: string; record?: any }>('/attendance/force-logout', { userId });
  },

  deleteRecord: (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`/attendance/${id}`);
  },

  clearAll: (): Promise<{ success: boolean; message: string; deletedCount: number }> => {
    return apiClient.delete<{ success: boolean; message: string; deletedCount: number }>('/attendance/clear-all');
  },

  // Lunch Break Actions
  startLunch: (notes?: string, userId?: string): Promise<{ success: boolean; message: string; record: AttendanceRecord }> => {
    return apiClient.post<{ success: boolean; message: string; record: AttendanceRecord }>('/attendance/lunch/start', {
      notes,
      userId,
    });
  },

  endLunch: (userId?: string): Promise<{ success: boolean; message: string; record: AttendanceRecord }> => {
    return apiClient.post<{ success: boolean; message: string; record: AttendanceRecord }>('/attendance/lunch/end', {
      userId,
    });
  },

  getLunchStatus: (userId?: string): Promise<LunchStatusResponse> => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return apiClient.get<LunchStatusResponse>(`/attendance/lunch/status${query}`);
  },

  // Employee Full Monthly History with Arrival, Departure & Lunch
  getEmployeeMonthlyHistory: (userId: string, month?: string): Promise<EmployeeMonthlyHistoryResponse> => {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    return apiClient.get<EmployeeMonthlyHistoryResponse>(`/attendance/employee/${encodeURIComponent(userId)}/history${query}`);
  },

  // Employee Daily Activity Report (Attendance, Work time, Lunch 20m, CRM tasks/calls)
  getEmployeeDailyReport: (userId: string, date?: string): Promise<EmployeeDailyReportResponse> => {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return apiClient.get<EmployeeDailyReportResponse>(`/attendance/employee/${encodeURIComponent(userId)}/daily-report${query}`);
  },

  // Admin manually records lunch
  recordLunchManual: (
    userId: string,
    data: { date: string; startTime: string; endTime: string; notes?: string }
  ): Promise<{ success: boolean; message: string; record: AttendanceRecord }> => {
    return apiClient.post<{ success: boolean; message: string; record: AttendanceRecord }>(
      `/attendance/employee/${encodeURIComponent(userId)}/lunch`,
      data
    );
  },
};
