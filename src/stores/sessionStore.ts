import { create } from 'zustand';
import { UserRole, UserSession } from '@/types';

let authSessionCheck: Promise<boolean> | null = null;

export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  SUPER_ADMIN: '/admin/dashboard',
  ORG_ADMIN: '/employee',
  SALES_MANAGER: '/employee',
  SALES_REP: '/employee',
  TELECALLER: '/employee',
  MARKETING_SDR: '/employee',
  FINANCE_VIEWER: '/employee',
};

export function getDashboardForRole(role?: string): string {
  if (!role) return '/employee';
  const cleanRole = role.toUpperCase().replace(/-/g, '_').trim();
  if (cleanRole === 'SUPER_ADMIN' || cleanRole === 'SUPERADMIN') {
    return '/admin/dashboard';
  }
  // All other employees / sales staff / managers navigate to Employee Dashboard
  return '/employee';
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: [
    'admin.view', 'admin.orgs', 'admin.health', 'admin.support', 'admin.audit',
    'lead.view', 'lead.create', 'lead.edit', 'lead.delete', 'lead.export', 'lead.assign',
    'deal.view', 'deal.create', 'deal.edit', 'deal.delete', 'contact.manage', 'company.manage',
    'call.view', 'call.make', 'call.recording.view', 'communication.send', 'task.manage',
    'meeting.manage', 'activity.view', 'proposal.manage', 'invoice.manage', 'payment.view',
    'payment.manage', 'ai.use', 'ai.admin', 'automation.manage', 'report.view', 'report.export',
    'user.manage', 'organization.manage', 'billing.manage', 'integration.manage', 'audit.view',
    'superadmin.operate'
  ],
  ORG_ADMIN: [
    'user.manage', 'organization.manage', 'billing.manage', 'integration.manage', 'audit.view',
    'lead.view', 'lead.create', 'lead.edit', 'lead.delete', 'lead.export', 'lead.assign',
    'deal.view', 'deal.create', 'deal.edit', 'deal.delete', 'contact.manage', 'company.manage',
    'call.view', 'call.make', 'call.recording.view', 'communication.send', 'task.manage',
    'meeting.manage', 'activity.view', 'proposal.manage', 'invoice.manage', 'payment.view',
    'payment.manage', 'ai.use', 'ai.admin', 'automation.manage', 'report.view', 'report.export'
  ],
  SALES_MANAGER: [
    'lead.view', 'lead.create', 'lead.edit', 'lead.export',
    'deal.view', 'deal.create', 'deal.edit', 'call.view', 'call.make', 'communication.send',
    'task.manage', 'meeting.manage', 'activity.view', 'proposal.manage', 'invoice.manage',
    'payment.view', 'report.view', 'report.export', 'ai.use', 'user.manage'
  ],
  SALES_REP: [
    'lead.view', 'lead.create', 'lead.edit',
    'deal.view', 'deal.create', 'deal.edit',
    'call.view', 'call.make', 'communication.send', 'task.manage', 'meeting.manage',
    'activity.view', 'proposal.manage', 'ai.use', 'report.view'
  ],
  TELECALLER: [
    'call.view', 'call.make', 'lead.view', 'lead.edit', 'communication.send',
    'task.manage', 'activity.view', 'ai.use'
  ],
  MARKETING_SDR: [
    'lead.view', 'lead.create', 'lead.edit', 'contact.manage', 'communication.send',
    'activity.view', 'report.view', 'ai.use'
  ],
  FINANCE_VIEWER: [
    'invoice.manage', 'payment.view', 'proposal.manage', 'report.view', 'report.export'
  ]
};

const INITIAL_USER: UserSession = {
  id: '',
  name: '',
  email: '',
  role: 'ORG_ADMIN',
  organizationId: '',
  organizationName: '',
  permissions: [],
};

interface SessionState {
  user: UserSession;
  organizationId: string;
  organizationName: string;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  isImpersonating: boolean;
  impersonatorAdminName: string | null;
  startImpersonation: (data: { accessToken: string; refreshToken?: string; user: any; adminName: string }) => void;
  stopImpersonation: () => Promise<void>;
  switchOrganization: (orgId: string, orgName: string) => void;
  setUserSession: (session: Partial<UserSession>) => void;
  checkAuthSession: () => Promise<boolean>;
  invalidateSession: () => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: INITIAL_USER,
  organizationId: '',
  organizationName: '',
  permissions: [],
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  isImpersonating: Boolean(localStorage.getItem('salesos.adminBackupToken')),
  impersonatorAdminName: localStorage.getItem('salesos.adminBackupName') || null,

  startImpersonation: (data: { accessToken: string; refreshToken?: string; user: any; adminName: string }) => {
    // 1. Back up current admin tokens
    const currentAdminToken = localStorage.getItem('salesos.accessToken') || '';
    const currentAdminRefresh = localStorage.getItem('salesos.refreshToken') || '';
    if (currentAdminToken) {
      localStorage.setItem('salesos.adminBackupToken', currentAdminToken);
      if (currentAdminRefresh) localStorage.setItem('salesos.adminBackupRefresh', currentAdminRefresh);
      localStorage.setItem('salesos.adminBackupName', data.adminName || 'Administrator');
    }

    // 2. Set employee tokens
    localStorage.setItem('salesos.accessToken', data.accessToken);
    sessionStorage.setItem('salesos.accessToken', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('salesos.refreshToken', data.refreshToken);
      sessionStorage.setItem('salesos.refreshToken', data.refreshToken);
    }

    // 3. Update session store
    get().setUserSession(data.user);
    set({
      isImpersonating: true,
      impersonatorAdminName: data.adminName || 'Administrator',
    });
  },

  stopImpersonation: async () => {
    const adminToken = localStorage.getItem('salesos.adminBackupToken');
    const adminRefresh = localStorage.getItem('salesos.adminBackupRefresh');

    localStorage.removeItem('salesos.adminBackupToken');
    localStorage.removeItem('salesos.adminBackupRefresh');
    localStorage.removeItem('salesos.adminBackupName');

    if (adminToken) {
      localStorage.setItem('salesos.accessToken', adminToken);
      sessionStorage.setItem('salesos.accessToken', adminToken);
      if (adminRefresh) {
        localStorage.setItem('salesos.refreshToken', adminRefresh);
        sessionStorage.setItem('salesos.refreshToken', adminRefresh);
      }
      set({ isImpersonating: false, impersonatorAdminName: null });
      await get().checkAuthSession();
    } else {
      get().logout();
    }
  },

  switchOrganization: (orgId: string, orgName: string) => {
    set((state) => ({
      organizationId: orgId,
      organizationName: orgName,
      user: { ...state.user, organizationId: orgId, organizationName: orgName }
    }));
  },

  setUserSession: (session: Partial<UserSession>) => {
    set((state) => {
      let rawRole = ((session.role || state.user.role || '') as string).toUpperCase().replace(/-/g, '_').trim();
      if (rawRole === 'SUPERADMIN') rawRole = 'SUPER_ADMIN';
      if (rawRole === 'ADMIN') rawRole = 'ORG_ADMIN';
      if (rawRole === 'EMPLOYEE' || rawRole === 'STAFF' || rawRole === 'USER' || rawRole === 'AGENT') rawRole = 'SALES_REP';
      if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, rawRole)) {
        rawRole = 'SALES_REP';
      }
      const role = rawRole as UserRole;

      const permissions = (session.permissions && session.permissions.length > 0)
        ? session.permissions
        : (ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.SUPER_ADMIN);

      const updatedUser: UserSession = {
        ...state.user,
        ...session,
        role,
        permissions,
      };
      return {
        user: updatedUser,
        organizationId: updatedUser.organizationId || state.organizationId,
        organizationName: updatedUser.organizationName || state.organizationName,
        permissions: updatedUser.permissions,
        isAuthenticated: true,
        isInitialized: true,
      };
    });
  },

  checkAuthSession: async () => {
    if (authSessionCheck) return authSessionCheck;

    set({ isLoading: true });
    authSessionCheck = (async () => {
      try {
        const { hasAuthTokens } = await import('@/lib/apiClient');
        if (!hasAuthTokens()) {
          set({ isAuthenticated: false, isInitialized: true, isLoading: false });
          return false;
        }

        // Dynamic import to avoid circular dependency
        const { authApi } = await import('@/features/auth/api/authApi');
        const response = await authApi.getMe();
        if (response && response.user) {
          get().setUserSession(response.user);
          set({ isAuthenticated: true, isInitialized: true, isLoading: false });
          return true;
        }
      } catch (err) {
        const status = typeof err === 'object' && err !== null && 'status' in err
          ? err.status
          : undefined;
        if (status !== 401) {
          console.warn('Session verification failed:', err);
        }
      }
      set({ isInitialized: true, isLoading: false });
      return false;
    })();

    try {
      return await authSessionCheck;
    } finally {
      authSessionCheck = null;
    }
  },

  invalidateSession: () => {
    clearSession(set);
  },

  logout: () => {
    clearSession(set);
    import('@/features/auth/api/authApi').then(({ authApi }) => {
      authApi.logout().catch(() => {});
    });
  }
}));

function clearSession(set: (partial: Partial<SessionState>) => void): void {
  localStorage.removeItem('salesos.adminBackupToken');
  localStorage.removeItem('salesos.adminBackupRefresh');
  localStorage.removeItem('salesos.adminBackupName');
  set({
    user: INITIAL_USER,
    organizationId: '',
    organizationName: '',
    permissions: [],
    isAuthenticated: false,
    isInitialized: true,
    isLoading: false,
    isImpersonating: false,
    impersonatorAdminName: null,
  });
}
