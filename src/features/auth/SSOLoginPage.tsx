import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import { apiClient } from '@/lib/apiClient';
import { ShieldCheck, AlertCircle, RefreshCw, LogIn, ArrowRight } from 'lucide-react';

interface VerifySsoResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    employeeId?: string;
    role: string;
    department?: string;
    organizationId: string;
    organizationName?: string;
    avatarUrl?: string;
    permissions?: string[];
  };
  redirectUrl: string;
}

export function SSOLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [userProfile, setUserProfile] = useState<VerifySsoResponse['user'] | null>(null);

  const token = searchParams.get('token') || searchParams.get('ssoToken') || '';
  const target = searchParams.get('target') || '/employee';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No Single Sign-On (SSO) token was provided in the URL query.');
      return;
    }

    let isMounted = true;

    async function executeVerification() {
      setStatus('verifying');
      setErrorMessage('');

      try {
        const data = await apiClient.post<VerifySsoResponse>('/api/v1/auth/verify-sso', {
          token,
          target,
        });

        // 1. Purge any stale tokens and previous sessions
        localStorage.removeItem('salesos.accessToken');
        localStorage.removeItem('salesos.refreshToken');
        sessionStorage.removeItem('salesos.accessToken');
        sessionStorage.removeItem('salesos.refreshToken');

        // 2. Persist fresh authentication tokens
        localStorage.setItem('salesos.accessToken', data.accessToken);
        sessionStorage.setItem('salesos.accessToken', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('salesos.refreshToken', data.refreshToken);
          sessionStorage.setItem('salesos.refreshToken', data.refreshToken);
        }

        // 3. Resolve role & enforce destination
        const userRole = ((data.user?.role || '') as string).toUpperCase().replace(/-/g, '_').trim();
        const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN';
        const cleanRole = isSuperAdmin ? 'SUPER_ADMIN' : 'SALES_REP';
        const destination = isSuperAdmin ? '/admin/dashboard' : '/employee';

        // 4. Hydrate global user session
        setUserProfile({ ...data.user, role: cleanRole });
        useSessionStore.getState().setUserSession({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: cleanRole as any,
          organizationId: data.user.organizationId,
          organizationName: data.user.organizationName || 'ADVMEN Workspace',
          employeeId: data.user.employeeId,
          department: data.user.department || 'Direct Sales & Outreach',
          permissions: data.user.permissions || [],
        });

        // 5. Mark success and trigger background session check
        setStatus('success');
        void useSessionStore.getState().checkAuthSession();

        // 6. Smooth transition to dashboard
        setTimeout(() => {
          if (isMounted) {
            navigate(destination, { replace: true });
          }
        }, 600);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('SSO verification failed:', err);
        setStatus('error');
        setErrorMessage(
          err?.message ||
          'Failed to authenticate your Single Sign-On session. The token may be expired or invalid.'
        );
      }
    }

    void executeVerification();

    return () => {
      isMounted = false;
    };
  }, [token, target, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-950 via-slate-900 to-neutral-950 text-white p-4 relative overflow-hidden select-none">
      {/* Background ambient radial glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-2xl bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 p-8 shadow-2xl relative z-10 text-center">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              ADVMEN Technologies
            </span>
          </div>
          <span className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
            Attendance Single Sign-On
          </span>
        </div>

        {/* State: VERIFYING */}
        {status === 'verifying' && (
          <div className="space-y-5 py-4">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
              <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-blue-400 border-b-transparent border-l-transparent animate-spin" />
              <RefreshCw className="h-6 w-6 text-blue-400 animate-spin" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-neutral-100">
                Verifying Single Sign-On...
              </h2>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                Validating your attendance token and initializing your secure CRM dashboard session.
              </p>
            </div>
          </div>
        )}

        {/* State: SUCCESS */}
        {status === 'success' && (
          <div className="space-y-5 py-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-8 w-8 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-emerald-400">
                SSO Verification Successful!
              </h2>
              <p className="text-xs text-neutral-400">
                Welcome back{userProfile?.name ? `, ${userProfile.name}` : ''}! Entering dashboard...
              </p>
            </div>

            {userProfile && (
              <div className="p-3 rounded-xl bg-neutral-800/60 border border-neutral-700/50 text-left flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-sm text-white">
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-200 truncate">{userProfile.name}</p>
                  <p className="text-xs text-neutral-400 truncate">
                    {userProfile.employeeId ? `${userProfile.employeeId} • ` : ''}
                    {userProfile.role}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-emerald-400 animate-pulse" />
              </div>
            )}
          </div>
        )}

        {/* State: ERROR */}
        {status === 'error' && (
          <div className="space-y-5 py-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-rose-400">
                Authentication Failed
              </h2>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                {errorMessage}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-neutral-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Verification
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign in with Password
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-neutral-500 relative z-10">
        Advmen Technologies Secure Single-Sign-On Gateway
      </p>
    </div>
  );
}
