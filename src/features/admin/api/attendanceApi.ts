import { apiClient } from '@/lib/apiClient';

export interface AttendanceLoginEvent {
  loginTime: string;
  logoutTime?: string;
  logoutBy?: 'ADMIN' | 'EMPLOYEE' | 'SYSTEM';
  logoutAdminName?: string;
  ipAddress?: string;
  userAgent?: string;
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
  summary: {
    totalEmployees: number;
    presentToday: number;
    lateToday: number;
    absentToday: number;
    attendanceRate: number;
    selectedDate: string;
  };
}

export const attendanceApi = {
  getAttendance: (startDate?: string, endDate?: string, date?: string): Promise<AttendanceListResponse> => {
    const params = new URLSearchParams({
      page: '1',
      limit: '5000',
    });
    if (startDate && endDate) {
      params.set('startDate', startDate);
      params.set('endDate', endDate);
    } else if (date) {
      params.set('date', date);
    } else {
      params.set('date', 'ALL');
    }
    return apiClient.get<AttendanceListResponse>(`/attendance?${params.toString()}`);
  },

  syncExternal: (): Promise<{ success: boolean; message: string; syncedCount: number }> => {
    return apiClient.post<{ success: boolean; message: string; syncedCount: number }>('/attendance/sync', {});
  },

  forceLogout: (userId: string): Promise<{ success: boolean; message: string; record?: any }> => {
    return apiClient.post<{ success: boolean; message: string; record?: any }>('/attendance/force-logout', { userId });
  },
};
