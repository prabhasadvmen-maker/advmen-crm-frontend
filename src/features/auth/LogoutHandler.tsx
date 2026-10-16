import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';

export function LogoutHandler() {
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

export default LogoutHandler;
