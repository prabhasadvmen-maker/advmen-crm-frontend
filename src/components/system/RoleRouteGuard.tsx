import { ReactNode } from 'react';
import { useSessionStore, ROLE_DASHBOARDS } from '@/stores/sessionStore';
import { UserRole } from '@/types';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

interface RoleRouteGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export function RoleRouteGuard({ allowedRoles, children }: RoleRouteGuardProps) {
  const { user } = useSessionStore();
  const navigate = useNavigate();

  const isAuthorized = allowedRoles.includes(user.role);

  if (!isAuthorized) {
    const isSuperAdminTarget = allowedRoles.includes('SUPER_ADMIN');

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-fib-21 text-center">
        <div className="max-w-md w-full skeuo-raised-3 bg-white p-fib-34 rounded-2xl border border-rose-200 shadow-2xl space-y-fib-21">
          {/* Security Icon */}
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm animate-bounce">
            {isSuperAdminTarget ? <Lock className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
          </div>

          <div className="space-y-fib-5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-fib-8 py-0.5 rounded-pill bg-rose-100 text-rose-800 border border-rose-200 font-mono">
              403 Forbidden • Access Denied
            </span>
            <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">
              {isSuperAdminTarget
                ? 'Super Admin Root Clearance Required'
                : 'Unauthorized Role Access'}
            </h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Your active account (<strong className="text-neutral-800">{user.name}</strong>) is logged in with role{' '}
              <strong className="text-blue-600 font-mono">{user.role.replace('_', ' ')}</strong> and does not have clearance to view this role module.
            </p>
          </div>

          {/* User Details Well */}
          <div className="p-fib-13 rounded-lg bg-neutral-100 border border-neutral-200 text-xs text-left space-y-fib-3 font-mono">
            <div className="flex justify-between text-[11px] text-neutral-500">
              <span>Required Role:</span>
              <span className="font-bold text-rose-700">{allowedRoles.join(', ')}</span>
            </div>
            <div className="flex justify-between text-[11px] text-neutral-500">
              <span>Current Role:</span>
              <span className="font-bold text-neutral-800">{user.role}</span>
            </div>
            <div className="flex justify-between text-[11px] text-neutral-500">
              <span>Tenant ID:</span>
              <span className="text-neutral-700">{user.organizationId}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-fib-8 justify-center pt-fib-8">
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate(ROLE_DASHBOARDS[user.role] || '/leads')}
            >
              Return to My Authorized Hub
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                window.location.href = '/login';
              }}
            >
              Log Out & Switch Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
