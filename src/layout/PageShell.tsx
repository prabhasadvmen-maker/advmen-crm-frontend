import { ReactNode, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandBar } from '@/components/patterns/CommandBar';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { useUIStore } from '@/stores/uiStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { cn } from '@/utils/cn';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';

interface PageShellProps {
  children?: ReactNode;
  loginRedirectPath?: string;
}

export function PageShell({ children, loginRedirectPath }: PageShellProps) {
  const { sidebarCollapsed, addToast } = useUIStore();
  const {
    isAuthenticated,
    isInitialized,
    isLoading,
    checkAuthSession,
    isImpersonating,
    impersonatorAdminName,
    stopImpersonation,
    user,
  } = useSessionStore();
  const [isReturningAdmin, setIsReturningAdmin] = useState(false);
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

  const handleReturnToAdmin = async () => {
    setIsReturningAdmin(true);
    try {
      await stopImpersonation();
      addToast({
        type: 'info',
        title: 'Admin Session Restored',
        message: 'Successfully returned to administrator workspace.',
      });
      navigate('/employees');
    } catch (err) {
      console.error('Failed to exit impersonation mode:', err);
      navigate('/employees');
    } finally {
      setIsReturningAdmin(false);
    }
  };

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
        {isImpersonating && (
          <aside
            aria-label="Admin impersonation notification"
            className="sticky top-0 z-40 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm font-medium border-b border-amber-800/20"
          >
            <div className="flex items-center gap-2 min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-200 shrink-0 animate-pulse" />
              <div className="truncate">
                <span>Admin Impersonation Mode: Active as </span>
                <strong className="underline decoration-amber-300 font-bold">{user.name || 'Employee'}</strong>
                {user.employeeId && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-black/25 text-[11px] font-mono tracking-wider">
                    {user.employeeId}
                  </span>
                )}
                {impersonatorAdminName && (
                  <span className="hidden md:inline ml-2 text-amber-100/90 text-xs">
                    (Authorized by {impersonatorAdminName})
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleReturnToAdmin}
              disabled={isReturningAdmin}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-neutral-900 hover:bg-amber-100 rounded-md font-semibold text-xs transition shadow active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {isReturningAdmin ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowLeft className="w-3.5 h-3.5" />
              )}
              <span>Return to Admin Console</span>
            </button>
          </aside>
        )}

        <TopBar />
        <main className="flex-1 p-fib-13 sm:p-fib-21 max-w-7xl w-full mx-auto space-y-fib-21">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
