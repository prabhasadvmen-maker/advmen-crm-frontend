import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export function SSORedirectPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');

    if (!token) {
      setError('No valid authentication token provided. Please sign in manually.');
      return;
    }

    try {
      // 1. Purge any previous session tokens
      localStorage.removeItem('salesos.accessToken');
      localStorage.removeItem('salesos.refreshToken');
      sessionStorage.removeItem('salesos.accessToken');
      sessionStorage.removeItem('salesos.refreshToken');

      // 2. Store fresh tokens in localStorage and sessionStorage
      localStorage.setItem('salesos.accessToken', token);
      sessionStorage.setItem('salesos.accessToken', token);
      if (refreshToken) {
        localStorage.setItem('salesos.refreshToken', refreshToken);
        sessionStorage.setItem('salesos.refreshToken', refreshToken);
      }

      // 3. Safely decode JWT payload to update session state immediately
      let userRole = 'SALES_REP';
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const rawRole = ((payload.role || '') as string).toUpperCase().replace(/-/g, '_').trim();
        userRole = (rawRole === 'SUPER_ADMIN' || rawRole === 'SUPERADMIN') ? 'SUPER_ADMIN' : 'SALES_REP';
        useSessionStore.getState().setUserSession({
          id: payload.id,
          name: payload.name,
          email: payload.email,
          role: userRole as any,
          organizationId: payload.organizationId,
          organizationName: payload.organizationName || 'ADVMEN Workspace',
          employeeId: payload.employeeId,
          department: payload.department,
          permissions: payload.permissions || [],
        });
      }

      // 4. Complete authentication session check and redirect to Role Dashboard
      const isSuperAdmin = userRole === 'SUPER_ADMIN';
      const destination = isSuperAdmin ? '/admin/dashboard' : '/employee';
      void useSessionStore.getState().checkAuthSession();
      navigate(destination, { replace: true });
    } catch (err: any) {
      console.error('SSO redirection processing failed:', err);
      setError('Could not process authentication session. Please sign in with your credentials.');
    }
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white p-4">
        <div className="max-w-md w-full rounded-2xl bg-neutral-800 p-8 border border-neutral-700 text-center space-y-4 shadow-xl">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Authentication Failed</h2>
          <p className="text-sm text-neutral-400">{error}</p>
          <a
            href="/login"
            className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-950 via-slate-900 to-neutral-950 text-white p-4">
      <div className="flex flex-col items-center space-y-4 text-center max-w-sm">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <CheckCircle2 className="h-6 w-6 text-emerald-400 absolute inset-0 m-auto" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white">Attendance Verified!</h2>
          <p className="text-xs text-neutral-400">
            Logging in and opening your Employee Dashboard...
          </p>
        </div>
      </div>
    </div>
  );
}
