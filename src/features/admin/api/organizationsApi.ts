import { apiClient } from '@/lib/apiClient';

export interface TenantOrgDto {
  id: string;
  organizationId: string;
  name: string;
  timezone?: string;
  settings?: {
    timezone: string;
    currency: string;
    leadResponseSlaMinutes: number;
    allowTelephonyRecording: boolean;
  };
  limits?: {
    maxUsers: number;
    maxLeads: number;
    maxStorageMb: number;
    aiTokensIncluded: number;
  };
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

export const organizationsApi = {
  getOrganizations: async (): Promise<TenantOrgDto[]> => {
    return await apiClient.get<TenantOrgDto[]>('/organizations');
  },

  getDashboardStats: async (): Promise<DashboardStatsDto> => {
    return await apiClient.get<DashboardStatsDto>('/organizations/dashboard-stats');
  },

  getPublicOrganizations: async (): Promise<TenantOrgDto[]> => {
    return await apiClient.get<TenantOrgDto[]>('/organizations/public');
  },

  getOrganizationById: async (id: string): Promise<TenantOrgDto> => {
    return await apiClient.get<TenantOrgDto>(`/organizations/${id}`);
  },

  updateOrganizationSettings: async (
    id: string,
    payload: {
      name: string;
      settings: NonNullable<TenantOrgDto['settings']>;
    }
  ): Promise<TenantOrgDto> => {
    return await apiClient.put<TenantOrgDto>(`/organizations/${id}/settings`, payload);
  },

  createOrganization: async (dto: CreateTenantOrgDto): Promise<TenantOrgDto> => {
    return await apiClient.post<TenantOrgDto>('/organizations', dto);
  },

  deleteOrganization: async (id: string): Promise<void> => {
    return await apiClient.delete(`/organizations/${id}`);
  },
};
