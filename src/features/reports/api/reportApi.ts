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

export const reportApi = {
  getOverview: () => apiClient.get<ReportOverview>('/reports/overview'),
};
