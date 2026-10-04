import { UserSession } from '@/types';
import { SlideOverPanel } from './SlideOverPanel';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import {
  ShieldCheck,
  Building2,
  Mail,
  Key,
  LogOut,
  UserCheck,
  CheckCircle2,
  BriefcaseBusiness,
  Phone,
  Fingerprint,
} from 'lucide-react';

interface UserProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSession;
  onLogout: () => void;
}

export function UserProfileDrawer({
  isOpen,
  onClose,
  user,
  onLogout,
}: UserProfileDrawerProps) {
  const roleDisplayNames: Record<string, string> = {
    SUPER_ADMIN: 'Super Administrator (Root Platform Ops)',
    ORG_ADMIN: 'Organization Administrator (Full Suite)',
    SALES_MANAGER: 'Sales Operations Manager',
    SALES_REP: 'Senior Account Executive / Sales Rep',
    TELECALLER: 'Telephony Outreach Specialist',
    MARKETING_SDR: 'Marketing Sales Development Rep',
    FINANCE_VIEWER: 'Finance & Invoicing Controller',
  };

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={onClose}
      title="User Account & Security Profile"
      subtitle="Multi-Tenant Session & RBAC Permissions"
      width="lg"
    >
      <div className="space-y-fib-21">
        {/* User Card */}
        <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-5 text-white">
            <div className="flex items-center gap-4">
              <Avatar name={user.name} src={user.avatarUrl} size="lg" status="online" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="truncate text-lg font-extrabold">{user.name || 'Workspace user'}</h4>
                  <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
                    {user.role.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-blue-100">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {user.email || 'Email not provided'}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                <Building2 className="h-3.5 w-3.5" /> Workspace
              </span>
              <p className="mt-1 truncate text-xs font-bold text-neutral-900">
                {user.organizationName || 'Workspace not assigned'}
              </p>
              <p className="mt-0.5 truncate font-mono text-[10px] text-neutral-500">
                {user.organizationId || 'ID unavailable'}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                <Fingerprint className="h-3.5 w-3.5" /> Employee ID
              </span>
              <p className="mt-1 text-xs font-bold text-neutral-900">{user.employeeId || 'Admin account'}</p>
            </div>
            {user.department && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                  <BriefcaseBusiness className="h-3.5 w-3.5" /> Department
                </span>
                <p className="mt-1 text-xs font-bold text-neutral-900">{user.department}</p>
              </div>
            )}
            {user.phone && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </span>
                <p className="mt-1 text-xs font-bold text-neutral-900">{user.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Security & Authentication Info */}
        <div className="skeuo-raised-2 bg-white rounded-xl border border-neutral-200 p-fib-13 space-y-fib-8 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 border-b border-neutral-100 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Active Session Security Status</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                Session Type
              </span>
              <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                HTTP-only JWT session
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">
                Tenant Isolation
              </span>
              <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                Organization-scoped access
              </span>
            </div>
          </div>
        </div>

        {/* Role & Clearances */}
        <div className="skeuo-raised-2 bg-white rounded-xl border border-neutral-200 p-fib-13 space-y-fib-8 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
              <Key className="w-4 h-4 text-violet-600" />
              <span>Granted Permissions & Capabilities</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-50 text-violet-700 font-bold border border-violet-200">
              {user.permissions?.length || 0} Permissions Active
            </span>
          </div>

          <p className="text-[11px] text-neutral-500">
            {roleDisplayNames[user.role] || user.role}
          </p>

          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
            {user.permissions && user.permissions.length > 0 ? (
              user.permissions.map((perm) => (
                <span
                  key={perm}
                  className="text-[10px] font-mono font-semibold px-2 py-1 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
                >
                  {perm}
                </span>
              ))
            ) : (
              <span className="text-xs text-neutral-400">Standard user capabilities</span>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="pt-fib-13 border-t border-neutral-200 flex items-center justify-between gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Profile
          </Button>

          <Button
            variant="danger"
            size="sm"
            icon={<LogOut className="w-4 h-4" />}
            onClick={() => {
              onClose();
              onLogout();
            }}
          >
            Sign Out of Workspace
          </Button>
        </div>
      </div>
    </SlideOverPanel>
  );
}
