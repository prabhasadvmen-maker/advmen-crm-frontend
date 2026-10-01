import { create } from 'zustand';
import { UserRole, UserSession } from '@/types';

export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  SUPER_ADMIN: '/admin',
  ORG_ADMIN: '/admin',
  SALES_MANAGER: '/employee',
  SALES_REP: '/employee',
  TELECALLER: '/employee',
  MARKETING_SDR: '/employee',
  FINANCE_VIEWER: '/employee',
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: [
    'admin.view', 'admin.orgs', 'admin.health', 'admin.support', 'admin.audit',
    'lead.view', 'lead.create', 'lead.edit', 'lead.delete', 'lead.export', 'lead.assign',
    'deal.view', 'deal.create', 'deal.edit', 'deal.delete', 'pipeline.manage',
    'call.view', 'call.make', 'inbox.view', 'inbox.send', 'task.manage',
    'proposal.create', 'invoice.view', 'invoice.create', 'invoice.manage',
    'reports.view', 'ai.use', 'settings.manage', 'billing.manage'
  ],
  ORG_ADMIN: [
    'org.manage', 'team.manage', 'user.manage', 'billing.manage', 'settings.manage', 'integrations.manage',
    'lead.view', 'lead.create', 'lead.edit', 'lead.delete', 'lead.export', 'lead.assign',
    'deal.view', 'deal.create', 'deal.edit', 'deal.delete', 'pipeline.manage',
    'call.view', 'call.make', 'inbox.view', 'inbox.send', 'task.manage',
    'proposal.create', 'invoice.view', 'invoice.create', 'invoice.manage',
    'reports.view', 'ai.use'
  ],
  SALES_MANAGER: [
    'lead.view', 'lead.create', 'lead.edit', 'lead.export',
    'deal.view', 'deal.create', 'deal.edit', 'pipeline.manage', 'approvals.manage',
    'team.performance', 'call.view', 'call.make', 'inbox.view', 'task.manage',
    'proposal.create', 'reports.view', 'ai.use'
  ],
  SALES_REP: [
    'lead.view', 'lead.create', 'lead.edit',
    'deal.view', 'deal.create', 'deal.edit',
    'call.view', 'call.make', 'inbox.view', 'inbox.send',
    'task.manage', 'proposal.create', 'ai.use'
  ],
  TELECALLER: [
    'call.view', 'call.make', 'call.queue', 'lead.view', 'lead.edit_status', 'task.manage'
  ],
  MARKETING_SDR: [
    'lead.view', 'lead.create', 'lead.import',
    'campaigns.view', 'inbox.view', 'reports.view', 'ai.use'
  ],
  FINANCE_VIEWER: [
    'invoice.view', 'invoice.create', 'invoice.manage', 'payment.view',
    'deal.view', 'reports.view'
  ]
};

const DEFAULT_USERS: Record<UserRole, UserSession> = {
  SUPER_ADMIN: {
    id: 'usr_super_01',
    name: 'Super Administrator',
    email: 'admin@platform.com',
    role: 'SUPER_ADMIN',
    organizationId: 'org_advmen_platform',
    organizationName: 'ADVMEN Platform Ops',
    permissions: ROLE_PERMISSIONS.SUPER_ADMIN
  },
  ORG_ADMIN: {
    id: 'usr_org_admin_01',
    name: 'Organization Admin',
    email: 'admin@platform.com',
    role: 'ORG_ADMIN',
    organizationId: 'org_advmen_platform',
    organizationName: 'ADVMEN Platform Ops',
    permissions: ROLE_PERMISSIONS.ORG_ADMIN
  },
  SALES_MANAGER: {
    id: 'usr_mgr_01',
    name: 'Sales Manager',
    email: 'manager@platform.com',
    role: 'SALES_MANAGER',
    organizationId: 'org_advmen_platform',
    organizationName: 'ADVMEN Platform Ops',
    permissions: ROLE_PERMISSIONS.SALES_MANAGER
  },
  SALES_REP: {
    id: 'usr_rep_01',
    name: 'Sales Representative',
    email: 'rep@platform.com',
    role: 'SALES_REP',
    organizationId: 'org_advmen_platform',
    organizationName: 'ADVMEN Platform Ops',
    permissions: ROLE_PERMISSIONS.SALES_REP
  },
  TELECALLER: {
    id: 'usr_tele_01',
    name: 'Telecaller Agent',
    email: 'outreach@platform.com',
    role: 'TELECALLER',
    organizationId: 'org_advmen_platform',
    organizationName: 'ADVMEN Platform Ops',
    permissions: ROLE_PERMISSIONS.TELECALLER
  },
  MARKETING_SDR: {
    id: 'usr_sdr_01',
    name: 'Marketing SDR',
    email: 'sdr@platform.com',
    role: 'MARKETING_SDR',
    organizationId: 'org_advmen_platform',
    organizationName: 'ADVMEN Platform Ops',
    permissions: ROLE_PERMISSIONS.MARKETING_SDR
  },
  FINANCE_VIEWER: {
    id: 'usr_fin_01',
    name: 'Finance Viewer',
    email: 'finance@platform.com',
    role: 'FINANCE_VIEWER',
    organizationId: 'org_advmen_platform',
    organizationName: 'ADVMEN Platform Ops',
    permissions: ROLE_PERMISSIONS.FINANCE_VIEWER
  }
};

interface SessionState {
  user: UserSession;
  organizationId: string;
  organizationName: string;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  switchRole: (role: UserRole) => void;
  switchOrganization: (orgId: string, orgName: string) => void;
  setUserSession: (session: Partial<UserSession>) => void;
  checkAuthSession: () => Promise<boolean>;
  logout: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: DEFAULT_USERS.ORG_ADMIN,
  organizationId: DEFAULT_USERS.ORG_ADMIN.organizationId,
  organizationName: DEFAULT_USERS.ORG_ADMIN.organizationName,
  permissions: DEFAULT_USERS.ORG_ADMIN.permissions,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  switchRole: (role: UserRole) => {
    const newUser = DEFAULT_USERS[role] || DEFAULT_USERS.ORG_ADMIN;
    set({
      user: newUser,
      organizationId: newUser.organizationId,
      organizationName: newUser.organizationName,
      permissions: newUser.permissions,
      isAuthenticated: true,
      isInitialized: true,
    });
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
      let rawRole = ((session.role || state.user.role || '') as string).toUpperCase().replace('-', '_');
      if (rawRole === 'SUPERADMIN') rawRole = 'SUPER_ADMIN';
      if (rawRole === 'ADMIN') rawRole = 'ORG_ADMIN';
      const role = (ROLE_PERMISSIONS[rawRole as UserRole] ? rawRole : 'SUPER_ADMIN') as UserRole;

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
    set({ isLoading: true });
    try {
      // Dynamic import to avoid circular dependency
      const { authApi } = await import('@/features/auth/api/authApi');
      const response = await authApi.getMe();
      if (response && response.user) {
        get().setUserSession(response.user);
        set({ isAuthenticated: true, isInitialized: true, isLoading: false });
        return true;
      }
    } catch (err) {
      console.warn('⚠️ Session verification bypassed or backend offline:', err);
    }
    set({ isInitialized: true, isLoading: false });
    return false;
  },

  logout: () => {
    set({ isAuthenticated: false });
    import('@/features/auth/api/authApi').then(({ authApi }) => {
      authApi.logout().catch(() => {});
    });
  }
}));
