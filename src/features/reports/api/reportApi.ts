import { apiClient } from '@/lib/apiClient';
import { DealStage } from '@/types';

export interface ReportCurrencySummary {
  currency: 'INR';
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  activeDeals: number;
  pipelineValue: number;
  wonRevenue: number;
}

export interface ReportStageMetric {
  stage: DealStage;
  currency: 'INR';
  count: number;
  value: number;
}

export interface ReportOverview {
  summary: ReportCurrencySummary[];
  stages: ReportStageMetric[];
  collectedPayments: Array<{ currency: 'INR'; amount: number }>;
  totals: {
    totalDeals: number;
    activeDeals: number;
    wonDeals: number;
    lostDeals: number;
    closedDeals: number;
    winRate: number;
  };
  recentDeals: Array<{
    id: string;
    dealId: string;
    title: string;
    company: string;
    value: number;
    currency: 'INR';
    stage: DealStage;
    updatedAt?: string;
  }>;
}

export interface WorkReportItem {
  _id: string;
  organizationId: string;
  userId: string;
  employeeId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  department: string;
  role: string;
  date: string;
  workCategory: string;
  workReport: string;
  developmentChanges?: string;
  taskSummary?: string;
  punchInTime?: string;
  punchOutTime?: string;
  shiftDurationSeconds?: number;
  shiftDurationFormatted?: string;
  selfieUrl?: string;
  punchOutImageUrl?: string;
  location?: any;
  logoutLocation?: any;
  submittedAt: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REVIEWED' | 'REJECTED';
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  source: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkReportsResponse {
  reports: WorkReportItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalReports: number;
    todayReports: number;
    uniqueEmployees: number;
    categories: Array<{ category: string; count: number }>;
  };
}

export interface GetWorkReportsParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  employeeId?: string;
  department?: string;
  workCategory?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const reportApi = {
  getOverview: () => apiClient.get<ReportOverview>('/reports/overview'),

  getWorkReports: (params?: GetWorkReportsParams) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const qs = searchParams.toString();
    return apiClient.get<WorkReportsResponse>(qs ? `/reports/work-reports?${qs}` : '/reports/work-reports');
  },

  getWorkReportById: (id: string) =>
    apiClient.get<WorkReportItem>(`/reports/work-reports/${id}`),

  submitWorkReport: (data: Partial<WorkReportItem>) =>
    apiClient.post<WorkReportItem>('/reports/work-reports', data),

  reviewWorkReport: (id: string, data: { status: string; reviewNotes?: string }) =>
    apiClient.patch<WorkReportItem>(`/reports/work-reports/${id}/review`, data),

  syncWorkReports: () =>
    apiClient.post<{ syncedCount: number }>('/reports/work-reports/sync'),
};
