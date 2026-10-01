import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore, ROLE_DASHBOARDS } from '@/stores/sessionStore';
import { useUIStore } from '@/stores/uiStore';
import { useNotificationStore, AppNotification } from '@/stores/notificationStore';
import { organizationsApi, TenantOrgDto } from '@/features/admin/api/organizationsApi';

import { UserProfileDrawer } from '@/components/patterns/UserProfileDrawer';
import {
  Search,
  Bell,
  Building2,
  ChevronDown,
  Sparkles,
  Menu,
  AlertTriangle,
  LogOut,
  User,
  ExternalLink,
  DollarSign,
  PhoneCall,
  CheckCircle2,
  FileText,
  Check,
  Trash2,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/utils/cn';

export function TopBar() {
  const { user, switchOrganization, logout } = useSessionStore();
  const { setCommandBarOpen, setMobileSidebarOpen, addToast } = useUIStore();
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const navigate = useNavigate();
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [organizations, setOrganizations] = useState<TenantOrgDto[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'deal':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      case 'invoice':
        return <DollarSign className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
      case 'lead':
        return <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
      case 'call':
        return <PhoneCall className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
      case 'task':
        return <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
      case 'proposal':
        return <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
      case 'sla':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-neutral-600 shrink-0" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Recent';
    }
  };

  useEffect(() => {
    organizationsApi.getOrganizations().then((orgs) => {
      if (Array.isArray(orgs) && orgs.length > 0) {
        setOrganizations(orgs);
      }
    }).catch(() => {});
  }, [user.organizationId]);

  // Auto-collapse open dropdown menus when scrolling outside
  useEffect(() => {
    if (!userMenuOpen && !orgMenuOpen && !notificationsOpen) return;

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | null;
      // Allow internal scrolling if dropdown content itself is scrolled
      if (target?.closest?.('.skeuo-raised-3')) {
        return;
      }
      setUserMenuOpen(false);
      setOrgMenuOpen(false);
      setNotificationsOpen(false);
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('wheel', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('wheel', handleScroll);
    };
  }, [userMenuOpen, orgMenuOpen, notificationsOpen]);

  const handleLogout = async () => {
    // store.logout() calls authApi.logout() internally — calling it directly here too
    // caused a double-request: the 2nd hit had no session → 401 → refresh → 422 cascade.
    logout();
    addToast({ type: 'info', title: 'Logged out successfully', message: 'Returning to login portal.' });
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-16 bg-white border-b border-neutral-200 sticky top-0 z-30 flex items-center justify-between px-fib-13 sm:px-fib-21 shadow-sm">
      {/* Left: Mobile menu toggle + Org switcher */}
      <div className="flex items-center gap-fib-8">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Tenant Organization Switcher */}
        <div className="relative">
          <button
            onClick={() => setOrgMenuOpen(!orgMenuOpen)}
            className="skeuo-btn-secondary flex items-center gap-fib-8 px-fib-13 py-fib-5 rounded-md text-xs font-semibold text-neutral-800"
          >
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="max-w-[140px] sm:max-w-[200px] truncate">{user.organizationName || 'Acme Enterprise Inc.'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          </button>

          {orgMenuOpen && (
            <>
              <div
                onClick={() => setOrgMenuOpen(false)}
                className="fixed inset-0 z-40"
              />
              <div className="absolute left-0 mt-1.5 w-60 skeuo-raised-3 bg-white rounded-md border border-neutral-200 p-fib-5 z-50 shadow-xl space-y-fib-3">
                <span className="px-fib-8 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Active Tenant Workspace
                </span>
                {organizations.map((org) => {
                  const orgId = org.organizationId || org.id;
                  const isCurrent = user.organizationId === orgId;

                  return (
                    <button
                      key={orgId}
                      onClick={() => {
                        switchOrganization(orgId, org.name);
                        setOrgMenuOpen(false);
                        addToast({
                          type: 'info',
                          title: 'Tenant Switched',
                          message: `Active workspace: ${org.name}`,
                        });
                      }}
                      className={cn(
                        'w-full text-left px-fib-8 py-fib-5 rounded-md text-xs flex items-center justify-between font-medium transition-colors',
                        isCurrent
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-neutral-700 hover:bg-neutral-100'
                      )}
                    >
                      <span>{org.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                          ACTIVE
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center: Command Palette Trigger */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-fib-21">
        <button
          onClick={() => setCommandBarOpen(true)}
          className="w-full flex items-center justify-between px-fib-13 py-fib-5 rounded-md bg-neutral-100 border border-neutral-200 text-neutral-400 text-xs hover:border-neutral-300 transition-colors shadow-inner"
        >
          <div className="flex items-center gap-fib-8">
            <Search className="w-3.5 h-3.5 text-neutral-400" />
            <span>Search deals, prospects, or commands...</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px] bg-white border border-neutral-200 rounded px-1.5 py-0.5 text-neutral-500 shadow-sm">
            <span>⌘</span>
            <span>K</span>
          </div>
        </button>
      </div>

      {/* Right: Actions, Notifications & User Avatar Dropdown */}
      <div className="flex items-center gap-fib-8">
        {/* Quick Global Command Trigger (Mobile) */}
        <button
          onClick={() => setCommandBarOpen(true)}
          className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600 md:hidden"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Real-Time Live Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600 transition-colors relative"
            title="Live Workspace Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <>
              <div onClick={() => setNotificationsOpen(false)} className="fixed inset-0 z-40" />
              <div className="absolute right-0 mt-1.5 w-80 sm:w-96 skeuo-raised-3 bg-white rounded-xl border border-neutral-200 p-3 z-50 shadow-2xl space-y-2 animate-in fade-in zoom-in-95 max-h-[460px] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-full font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllAsRead()}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => clearAll()}
                        className="text-[11px] text-neutral-400 hover:text-rose-600 transition-colors"
                        title="Clear notifications"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Notifications List */}
                <div className="overflow-y-auto space-y-1.5 flex-1 pr-1 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center space-y-1">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
                        <Check className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-semibold text-neutral-800">All caught up!</p>
                      <p className="text-[11px] text-neutral-400">No active alerts or events in this workspace.</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.link) {
                            navigate(n.link);
                            setNotificationsOpen(false);
                          }
                        }}
                        className={cn(
                          'p-2.5 rounded-lg border transition-all text-xs space-y-1 cursor-pointer select-none relative group',
                          !n.read
                            ? 'bg-blue-50/50 border-blue-100 hover:bg-blue-50 hover:border-blue-200'
                            : 'bg-neutral-50/50 border-neutral-100 hover:bg-neutral-50 hover:border-neutral-200 text-neutral-600'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
                            {getNotificationIcon(n.type)}
                            <span className="truncate">{n.title}</span>
                          </div>
                          <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                            {formatTimeAgo(n.timestamp)}
                          </span>
                        </div>
                        {n.message && (
                          <p className="text-[11px] text-neutral-600 leading-snug line-clamp-2">
                            {n.message}
                          </p>
                        )}
                        {!n.read && (
                          <span className="absolute top-2.5 right-2 w-1.5 h-1.5 rounded-full bg-blue-600" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Avatar + Interactive Dropdown Menu */}
        <div className="relative pl-fib-5 border-l border-neutral-200">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-neutral-100 transition-colors focus:outline-none cursor-pointer"
            title="User Profile & Settings"
            aria-expanded={userMenuOpen}
          >
            <Avatar name={user.name} src={user.avatarUrl} size="sm" status="online" />
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 hidden sm:block" />
          </button>

          {userMenuOpen && (
            <>
              <div onClick={() => setUserMenuOpen(false)} className="fixed inset-0 z-40" />
              <div className="absolute right-0 mt-2 w-64 skeuo-raised-3 bg-white rounded-xl border border-neutral-200 p-2 z-50 shadow-2xl space-y-1 animate-in fade-in zoom-in-95">
                {/* User Summary Header */}
                <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-100 space-y-1">
                  <p className="text-xs font-extrabold text-neutral-900 truncate">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-neutral-500 truncate font-mono">
                    {user.email}
                  </p>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {user.role.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>
                </div>

                <div className="h-px bg-neutral-100 my-1" />

                {/* Option 1: View Profile & Clearances */}
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    setProfileDrawerOpen(true);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 flex items-center gap-2.5 transition-colors"
                >
                  <User className="w-4 h-4 text-neutral-500" />
                  <span>View Full Profile & Permissions</span>
                </button>

                {/* Option 2: My Authorized Hub */}
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate(ROLE_DASHBOARDS[user.role] || '/leads');
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 flex items-center gap-2.5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-neutral-500" />
                  <span>Go to My Role Dashboard</span>
                </button>

                <div className="h-px bg-neutral-100 my-1" />

                {/* Option 3: Sign Out */}
                <button
                  onClick={async () => {
                    setUserMenuOpen(false);
                    await handleLogout();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out of Workspace</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* User Profile Detail Drawer */}
      <UserProfileDrawer
        isOpen={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        user={user}
        onLogout={handleLogout}
      />
    </header>
  );
}
