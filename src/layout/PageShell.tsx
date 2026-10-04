import { ReactNode, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandBar } from '@/components/patterns/CommandBar';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { useUIStore } from '@/stores/uiStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { cn } from '@/utils/cn';

interface PageShellProps {
  children?: ReactNode;
  loginRedirectPath?: string;
}

export function PageShell({ children, loginRedirectPath }: PageShellProps) {
  const { sidebarCollapsed } = useUIStore();
  const { isAuthenticated, isInitialized, isLoading, checkAuthSession } = useSessionStore();
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveLoginRedirectPath = loginRedirectPath || (
    ['/employees', '/attendance', '/settings', '/admin/dashboard', '/admin/team'].some(
      (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
    )
      ? '/admin/login'
      : '/login'
  );

  // Mount real-time WebSocket domain event listener
  useRealtimeEvents();

  useEffect(() => {
    if (!isInitialized) {
      checkAuthSession();
    } else if (!isAuthenticated && !isLoading) {
      navigate(effectiveLoginRedirectPath, { replace: true });
    }
  }, [isInitialized, isAuthenticated, isLoading, checkAuthSession, navigate, effectiveLoginRedirectPath]);

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-neutral-500 font-medium">Validating Secure Workspace Session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans text-neutral-900">
      <CommandBar />
      <ToastContainer />
      <Sidebar />

      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 ease-in-out min-w-0',
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[264px]'
        )}
      >
        <TopBar />
        <main className="flex-1 p-fib-13 sm:p-fib-21 max-w-7xl w-full mx-auto space-y-fib-21">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
