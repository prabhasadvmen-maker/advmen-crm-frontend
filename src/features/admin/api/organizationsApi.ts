import { apiClient, withFallback } from '@/lib/apiClient';

export interface TenantOrgDto {
  id: string;
  organizationId: string;
  name: string;
  slug?: string;
  tier: 'ENTERPRISE_PLUS' | 'ENTERPRISE' | 'PRO';
  planTier?: 'STARTER' | 'BUSINESS' | 'ENTERPRISE';
  planStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  activeUsers: number;
  maxUsers: number;
  storageGb: number;
  apiCalls24h: number;
  health: 'HEALTHY' | 'WARNING' | 'DEGRADED';
  slaStatus: 'COMPLIANT' | 'AT_RISK';
  createdAt?: string;
}

export interface CreateTenantOrgDto {
  name: string;
  planTier?: 'STARTER' | 'BUSINESS' | 'ENTERPRISE';
  limits?: {
    maxUsers: number;
    maxLeads: number;
    maxStorageMb: number;
    aiTokensIncluded: number;
  };
  settings?: {
    timezone: string;
    currency: string;
    leadResponseSlaMinutes: number;
    allowTelephonyRecording: boolean;
  };
}

export interface DashboardStatsDto {
  activeWorkspaces: number;
  provisionedStaffSeats: number;
  totalRevenue: number;
  totalLeads: number;
  finalizedLeadsCount: number;
  dealsWonCount: number;
  openQueries: number;
  totalTasks: number;
  pendingTasks: number;
  urgentTasks: number;
}

const FALLBACK_ORGS: TenantOrgDto[] = [];

export const organizationsApi = {
  getOrganizations: async (): Promise<TenantOrgDto[]> => {
    return await withFallback(
      apiClient.get<TenantOrgDto[]>('/organizations'),
      FALLBACK_ORGS,
      'Tenant Organizations'
    );
  },

  getDashboardStats: async (): Promise<DashboardStatsDto> => {
    return await withFallback(
      apiClient.get<DashboardStatsDto>('/organizations/dashboard-stats'),
      {
        activeWorkspaces: 1,
        provisionedStaffSeats: 4,
        totalRevenue: 0,
        totalLeads: 0,
        finalizedLeadsCount: 0,
        dealsWonCount: 0,
        openQueries: 0,
        totalTasks: 0,
        pendingTasks: 0,
        urgentTasks: 0,
      },
      'Dashboard Stats'
    );
  },

  getPublicOrganizations: async (): Promise<TenantOrgDto[]> => {
    return await withFallback(
      apiClient.get<TenantOrgDto[]>('/organizations/public'),
      FALLBACK_ORGS,
      'Public Tenant Organizations'
    );
  },

  getOrganizationById: async (id: string): Promise<TenantOrgDto> => {
    return await apiClient.get<TenantOrgDto>(`/organizations/${id}`);
  },

  createOrganization: async (dto: CreateTenantOrgDto): Promise<TenantOrgDto> => {
    return await apiClient.post<TenantOrgDto>('/organizations', dto);
  },

  deleteOrganization: async (id: string): Promise<void> => {
    return await apiClient.delete(`/organizations/${id}`);
  },
};

