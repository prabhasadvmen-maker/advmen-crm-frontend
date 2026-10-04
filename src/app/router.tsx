import { createBrowserRouter } from 'react-router-dom';
import { PageShell } from '@/layout/PageShell';
import { LoginPage, AdminLoginPage, SSORedirectPage } from '@/features/auth';
import { RoleRouteGuard } from '@/components/system/RoleRouteGuard';
import {
  SuperAdminDashboard,
  OrgAdminDashboard,
  SalesManagerDashboard,
  SalesRepDashboard,
  TelecallerDashboard,
  MarketingSDRDashboard,
  FinanceViewerDashboard,
} from '@/features/roles';
import { LeadsPage } from '@/features/leads';
import { DealsPage } from '@/features/deals';
import { CallsPage } from '@/features/calls';
import { InboxPage } from '@/features/inbox';
import { TasksPage } from '@/features/tasks';
import { ProposalsPage } from '@/features/proposals';
import { InvoicesPage } from '@/features/invoices';
import { ReportsPage } from '@/features/reports';
import { AICenterPage } from '@/features/ai';
import { AutomationPage } from '@/features/automation';
import { AdminDashboard, AttendancePage, EmployeeManagementPage } from '@/features/admin';
import { EmployeeDashboard } from '@/features/employee';
import { LeadImportPage } from '@/features/imports/LeadImportPage';
import { SettingsPage } from '@/features/admin/SettingsPage';

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';

function LogoutHandler() {
  const { logout } = useSessionStore();
  const navigate = useNavigate();

  useEffect(() => {
    void (async () => {
      await logout();
      navigate('/login?logout=true', { replace: true });
    })();
  }, [logout, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 text-neutral-600 text-sm">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <span>Signing out...</span>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/logout', element: <LogoutHandler /> },
  { path: '/auth/sso', element: <SSORedirectPage /> },
  { path: '/sso', element: <SSORedirectPage /> },
  { path: '/admin/login', element: <AdminLoginPage /> },
  { path: '/admin-login', element: <AdminLoginPage /> },
  { path: '/admin', element: <AdminLoginPage /> },
  {
    element: <PageShell />,
    children: [
      {
        path: '/employee',
        element: (
          <RoleRouteGuard allowedRoles={['SALES_REP', 'TELECALLER', 'SALES_MANAGER', 'MARKETING_SDR', 'FINANCE_VIEWER', 'ORG_ADMIN', 'SUPER_ADMIN']}>
            <EmployeeDashboard />
          </RoleRouteGuard>
        ),
      },
      {
        path: '/employee/dashboard',
        element: (
          <RoleRouteGuard allowedRoles={['SALES_REP', 'TELECALLER', 'SALES_MANAGER', 'MARKETING_SDR', 'FINANCE_VIEWER', 'ORG_ADMIN', 'SUPER_ADMIN']}>
            <EmployeeDashboard />
          </RoleRouteGuard>
        ),
      },
      {
        path: '/roles/super-admin',
        element: (
          <RoleRouteGuard allowedRoles={['SUPER_ADMIN']}>
            <SuperAdminDashboard />
          </RoleRouteGuard>
        ),
      },
      {
        path: '/roles/org-admin',
        element: (
          <RoleRouteGuard allowedRoles={['ORG_ADMIN', 'SUPER_ADMIN']}>
            <OrgAdminDashboard />
          </RoleRouteGuard>
        ),
      },
      {
        path: '/roles/sales-manager',
        element: (
          <RoleRouteGuard allowedRoles={['SALES_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN']}>
            <SalesManagerDashboard />
          </RoleRouteGuard>
        ),
      },
      {
        path: '/roles/sales-rep',
        element: (
          <RoleRouteGuard allowedRoles={['SALES_REP', 'SALES_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN']}>
            <SalesRepDashboard />
          </RoleRouteGuard>
        ),
      },
      {
        path: '/roles/telecaller',
        element: (
          <RoleRouteGuard allowedRoles={['TELECALLER', 'SALES_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN']}>
            <TelecallerDashboard />
          </RoleRouteGuard>
        ),
      },
      {
        path: '/roles/marketing-sdr',
        element: (
          <RoleRouteGuard allowedRoles={['MARKETING_SDR', 'SALES_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN']}>
            <MarketingSDRDashboard />
          </RoleRouteGuard>
        ),
      },
      {
        path: '/roles/finance-viewer',
        element: (
          <RoleRouteGuard allowedRoles={['FINANCE_VIEWER', 'ORG_ADMIN', 'SUPER_ADMIN']}>
            <FinanceViewerDashboard />
          </RoleRouteGuard>
        ),
      },
      {
        path: '/employees',
        element: (
          <RoleRouteGuard allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN', 'SALES_MANAGER']}>
            <EmployeeManagementPage />
          </RoleRouteGuard>
        ),
      },
      {
        path: '/admin/employees',
        element: (
          <RoleRouteGuard allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN', 'SALES_MANAGER']}>
            <EmployeeManagementPage />
          </RoleRouteGuard>
        ),
      },
      { path: '/leads', element: <LeadsPage /> },
      {
        path: '/attendance',
        element: (
          <RoleRouteGuard allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN']}>
            <AttendancePage />
          </RoleRouteGuard>
        ),
      },
      {
        path: '/settings',
        element: (
          <RoleRouteGuard allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN']}>
            <SettingsPage />
          </RoleRouteGuard>
        ),
      },
      { path: '/pipeline', element: <DealsPage /> },
      { path: '/calls', element: <CallsPage /> },
      { path: '/inbox', element: <InboxPage /> },
      { path: '/tasks', element: <TasksPage /> },
      { path: '/proposals', element: <ProposalsPage /> },
      { path: '/invoices', element: <InvoicesPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/ai', element: <AICenterPage /> },
      { path: '/automation', element: <AutomationPage /> },
      {
        path: '/lead-import',
        element: (
          <RoleRouteGuard allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN', 'SALES_MANAGER']}>
            <LeadImportPage />
          </RoleRouteGuard>
        ),
      },
      {
        path: '/admin/dashboard',
        element: (
          <RoleRouteGuard allowedRoles={['SUPER_ADMIN']}>
            <AdminDashboard />
          </RoleRouteGuard>
        ),
      },
      {
        path: '/admin/team',
        element: (
          <RoleRouteGuard allowedRoles={['SUPER_ADMIN', 'ORG_ADMIN', 'SALES_MANAGER']}>
            <EmployeeManagementPage />
          </RoleRouteGuard>
        ),
      },
    ],
  },
  { path: '*', element: <LoginPage /> },
]);
