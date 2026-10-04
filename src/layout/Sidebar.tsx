import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSessionStore, ROLE_DASHBOARDS } from '@/stores/sessionStore';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  FileText,
  CreditCard,
  BarChart3,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Layers,
  Zap,
  Upload,
  UserCheck,
  HelpCircle,
  CalendarClock,
  Settings,
  LogOut,
} from 'lucide-react';
import { UserRole } from '@/types';

import { useLeads } from '@/features/leads/hooks/useLeads';
import { useTasks } from '@/features/tasks/hooks/useTasks';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  permission?: string;
  badge?: string;
}

export function Sidebar() {
  const { user, logout } = useSessionStore();
  const navigate = useNavigate();
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const location = useLocation();
  const { leads = [] } = useLeads();
  const { tasks = [] } = useTasks();

  // Prevent background scrolling on mobile when sidebar drawer is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [mobileSidebarOpen]);

  const userRoleUpper = ((user?.role || '') as string).toUpperCase().replace('-', '_');
  const normalizedRole = userRoleUpper === 'SUPERADMIN' ? 'SUPER_ADMIN' : userRoleUpper === 'ADMIN' ? 'ORG_ADMIN' : userRoleUpper;
  const userRoleDashboardPath = ROLE_DASHBOARDS[normalizedRole as UserRole] || (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'ORG_ADMIN' ? '/admin' : '/leads');

  const openQueriesCount = leads.reduce((acc, l) => acc + (l.queries?.filter((q) => q.status === 'OPEN').length || 0), 0);
  const pendingTasksCount = tasks.filter((t) => !t.isCompleted).length;

  const isAdmin = normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'ORG_ADMIN';

  const navigationItems: NavItem[] = [
    {
      label: isAdmin ? 'Admin Command Center' : 'Employee Workspace',
      path: userRoleDashboardPath,
      icon: <LayoutDashboard className="w-4 h-4 text-blue-500" />
    },
    ...(isAdmin
      ? [{ label: 'Employee Management', path: '/employees', icon: <UserCheck className="w-4 h-4 text-indigo-400" /> }]
      : []),
    ...(isAdmin
      ? [{ label: 'Attendance', path: '/attendance', icon: <CalendarClock className="w-4 h-4 text-emerald-400" /> }]
      : []),
    ...(isAdmin
      ? [{ label: 'Settings', path: '/settings', icon: <Settings className="w-4 h-4 text-slate-400" /> }]
      : []),
    {
      label: isAdmin ? 'Leads & Prospects' : 'My Assigned Leads',
      path: '/leads',
      icon: <Users className="w-4 h-4" />,
      permission: 'lead.view',
      badge: leads.length > 0 ? String(leads.length) : undefined,
    },
    { label: isAdmin ? 'Deals & Pipeline' : 'My Deals Pipeline', path: '/pipeline', icon: <Kanban className="w-4 h-4" />, permission: isAdmin ? 'deal.view' : undefined },
    {
      label: 'Lead Queries',
      path: '/calls',
      icon: <HelpCircle className="w-4 h-4 text-amber-500" />,
      permission: 'call.view',
      badge: openQueriesCount > 0 ? String(openQueriesCount) : undefined,
    },
    {
      label: 'Tasks & Activities',
      path: '/tasks',
      icon: <CheckSquare className="w-4 h-4" />,
      permission: 'task.manage',
      badge: pendingTasksCount > 0 ? String(pendingTasksCount) : undefined,
    },
    ...(!isAdmin
      ? [{ label: 'Proposals', path: '/proposals', icon: <FileText className="w-4 h-4" />, permission: 'proposal.manage' }]
      : []),
    { label: 'Invoices & Billing', path: '/invoices', icon: <CreditCard className="w-4 h-4" />, permission: 'invoice.manage' },
    { label: 'Reports & Analytics', path: '/reports', icon: <BarChart3 className="w-4 h-4" />, permission: 'report.view' },
    { label: 'AI Intelligence Center', path: '/ai', icon: <Sparkles className="w-4 h-4" />, permission: 'ai.use', badge: 'AI' },
    ...(!isAdmin
      ? [{ label: 'Automation Builder', path: '/automation', icon: <Zap className="w-4 h-4" />, permission: 'automation.manage' }]
      : []),
    { label: 'Import & Distribute', path: '/lead-import', icon: <Upload className="w-4 h-4" />, permission: 'lead.assign' },
  ];

  // Strictly filter by server-driven permissions
  const filteredNavItems = navigationItems.filter(
    (item) => !item.permission || (user?.permissions ? user.permissions.includes(item.permission) : false)
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 bg-neutral-900 border-r border-neutral-800 text-neutral-300 flex flex-col transition-all duration-300 ease-in-out select-none shadow-xl',
          sidebarCollapsed ? 'w-[72px]' : 'w-[264px]',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className={cn(
          'shrink-0 border-b border-neutral-800/80 bg-neutral-900/90',
          sidebarCollapsed
            ? 'h-16 flex items-center justify-center gap-1 px-1'
            : 'h-16 flex items-center justify-between px-fib-13'
        )}>
          <div className={cn('flex items-center overflow-hidden', sidebarCollapsed ? 'shrink-0' : 'gap-fib-8')}>
            <div className={cn(
              'rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-elevation-1 border border-blue-400/30 shrink-0',
              sidebarCollapsed ? 'w-8 h-8' : 'w-9 h-9'
            )}>
              <Layers className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <span className="font-extrabold text-sm tracking-tight text-white block truncate">
                  ADVMEN <span className="text-blue-400 font-semibold">SalesOS</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-mono block truncate">
                  Enterprise RevOps
                </span>
              </div>
            )}
          </div>

          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 lg:flex"
              title="Expand sidebar"
              aria-label="Expand sidebar"
              aria-expanded={false}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 lg:flex"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              aria-expanded={true}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation Link List */}
        <nav className="flex-1 overflow-y-auto px-fib-8 py-fib-13 space-y-fib-5">
          {filteredNavItems.map((item) => {
            const isItemActive = (() => {
              if (item.path === '/employees') {
                return (
                  location.pathname === '/employees' ||
                  location.pathname.startsWith('/admin/employees') ||
                  location.pathname === '/admin/team' ||
                  (location.pathname === '/admin' && location.search.includes('tab=users'))
                );
              }
              if (item.path === '/admin' || item.path.startsWith('/admin')) {
                return (
                  location.pathname.startsWith('/admin') &&
                  !location.search.includes('tab=users') &&
                  location.pathname !== '/admin/team' &&
                  !location.pathname.startsWith('/admin/employees')
                );
              }
              return location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            })();

            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-fib-8 px-fib-13 py-fib-8 rounded-md text-xs font-medium transition-all duration-150 relative group',
                  isItemActive
                    ? 'bg-blue-600/90 text-white font-semibold shadow-elevation-1 border border-blue-500/50'
                    : 'text-neutral-400 hover:bg-neutral-800/80 hover:text-white'
                )}
              >
                <div className={cn('shrink-0', isItemActive ? 'text-white' : 'text-neutral-400 group-hover:text-blue-400')}>
                  {item.icon}
                </div>

                {!sidebarCollapsed && (
                  <span className="truncate flex-1 tracking-tight">{item.label}</span>
                )}

                {!sidebarCollapsed && item.badge && (
                  <span
                    className={cn(
                      'px-fib-5 py-0.2 rounded-pill text-[10px] font-bold uppercase tracking-wider',
                      item.badge === 'Live'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                        : item.badge === 'AI'
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    )}
                  >
                    {item.badge}
                  </span>
                )}

                {isItemActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Current Tenant & Sign Out Footer */}
        <div className="p-fib-13 border-t border-neutral-800/80 bg-neutral-950/60">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between gap-fib-8 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-neutral-200 block truncate">
                    {user?.organizationName || 'Organization'}
                  </span>
                  <span className="text-[10px] text-neutral-500 block truncate font-mono">
                    {(user?.role || '').replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/login?logout=true');
                }}
                className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-900 hover:bg-rose-950/80 text-neutral-400 hover:text-rose-300 border border-neutral-800 hover:border-rose-900/50 transition-colors shrink-0"
                title="Sign Out / Exit Workspace"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold">Exit</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex justify-center" title={`${user?.organizationName || ''} (${user?.role || ''})`}>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-neutral-800" />
              </div>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/login?logout=true');
                }}
                className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 transition-colors"
                title="Sign Out / Exit"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
