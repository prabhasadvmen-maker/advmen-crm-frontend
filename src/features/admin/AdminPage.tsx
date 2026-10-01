import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { KPICard } from '@/components/patterns/KPICard';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { useUIStore } from '@/stores/uiStore';
import { useSessionStore } from '@/stores/sessionStore';
import { UserRole } from '@/types';
import { usersApi, UserDto } from './api/usersApi';
import {
  Users,
  Shield,
  HardDrive,
  Key,
  UserCheck,
  Plus,
  X,
  Sparkles,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react';

const AVAILABLE_ROLES: { role: UserRole; label: string; description: string }[] = [
  { role: 'SALES_REP', label: 'Sales Representative', description: 'Access to Deals pipeline, Leads, and Quotes' },
  { role: 'TELECALLER', label: 'Telecaller / Outreach', description: 'Dialer queue, contact list, and call disposition metrics' },
  { role: 'SALES_MANAGER', label: 'Sales Manager', description: 'Team leaderboards, quota approvals, and pipeline insights' },
  { role: 'MARKETING_SDR', label: 'Marketing / Inbound SDR', description: 'Inbound lead enrichment, campaign capture & scoring' },
  { role: 'FINANCE_VIEWER', label: 'Finance Viewer', description: 'Read-only access to invoices, payments, and financial analytics' },
  { role: 'ORG_ADMIN', label: 'Organization Admin', description: 'Full workspace administration, role assignment & billing' },
];

export function AdminPage() {
  const { addToast } = useUIStore();
  const { user: currentUser, organizationId } = useSessionStore();
  const [members, setMembers] = useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<UserDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Strictly lock background body and html scrolling when modal is open
  useEffect(() => {
    if (isInviteOpen || memberToDelete) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isInviteOpen, memberToDelete]);

  // Fetch live team members from database
  const loadTeamMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await usersApi.getUsers(
        organizationId ? { organizationId } : undefined
      );
      if (Array.isArray(data)) {
        setMembers(data);
      }
    } catch (err: any) {
      console.error('Failed to load team members:', err);
      addToast({
        type: 'danger',
        title: 'Error Loading Members',
        message: err?.message || 'Could not fetch user roster.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast, organizationId]);

  useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers, organizationId]);

  // Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('SALES_REP');
  const [newPassword, setNewPassword] = useState('SalesOS2026!Secure');
  const [department, setDepartment] = useState('Sales Operations');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = 'Advmen';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += '!';
    setNewPassword(pass);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      addToast({
        type: 'danger',
        title: 'Missing Details',
        message: 'Please provide both a full name and work email address.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const createdUser = await usersApi.createUser({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        role: newRole,
        department: department.trim() || 'General Sales',
        organizationId: organizationId || currentUser.organizationId,
      });

      // Instantly prepend newly created user in UI
      setMembers((prev) => [createdUser, ...prev.filter((m) => m.id !== createdUser.id)]);
      setIsInviteOpen(false);

      // Reset form
      setNewName('');
      setNewEmail('');
      setNewRole('SALES_REP');
      setNewPassword('SalesOS2026!Secure');
      setDepartment('Sales Operations');

      addToast({
        type: 'success',
        title: 'Team Member Provisioned!',
        message: `Created ${newRole.replace(/_/g, ' ')} account for ${createdUser.name} (${createdUser.email}). Ready to sign in!`,
      });
    } catch (err: any) {
      console.error('Failed to provision team member:', err);
      addToast({
        type: 'danger',
        title: 'Provisioning Failed',
        message: err?.message || 'Could not provision new team member.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    try {
      await usersApi.deleteUser(memberToDelete.id);
      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
      addToast({
        type: 'success',
        title: 'Member Removed',
        message: `Successfully removed ${memberToDelete.name} from active workspace roster.`,
      });
      setMemberToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete member:', err);
      addToast({
        type: 'danger',
        title: 'Removal Failed',
        message: err?.message || 'Failed to remove user account.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.department && m.department.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-fib-21">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-fib-13 pb-fib-8 border-b border-neutral-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            Organization Admin & Seat Provisioning
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Role-based access control, team member provisioning, API credentials, and tenant parameters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={() => loadTeamMembers()}
            disabled={isLoading}
          >
            Refresh Roster
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsInviteOpen(true)}
          >
            Add Team Member
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-fib-13">
        <WidgetBoundary name="kpi-seat-usage">
          <KPICard
            label="Active Seats Utilized"
            value={`${members.length} / 50`}
            delta={`${Math.max(0, 50 - members.length)} Available`}
            deltaDirection="up"
            accent="blue"
            icon={<Users className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-role-types">
          <KPICard
            label="Configured Roles"
            value={`${new Set(members.map((m) => m.role)).size} Active Roles`}
            subtext="Zero-trust RBAC matrix"
            accent="neutral"
            icon={<Shield className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-api-keys">
          <KPICard
            label="Active API Webhooks"
            value="6 Live"
            subtext="99.99% deliverability"
            accent="green"
            icon={<Key className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-cloud-storage">
          <KPICard
            label="Call Audio Storage"
            value="148 GB"
            subtext="Encrypted with AES-256"
            accent="neutral"
            icon={<HardDrive className="w-4 h-4" />}
          />
        </WidgetBoundary>
      </div>

      {/* Team Member Management Table */}
      <WidgetBoundary name="admin-team-table">
        <div className="skeuo-raised-2 bg-white rounded-md border border-neutral-200 overflow-hidden shadow-sm">
          <div className="p-fib-13 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Tenant User Roster & Role Assignments
              </h3>
              <p className="text-[11px] text-neutral-500">
                Active seats with cryptographic tenant isolation and assigned permission gates.
              </p>
            </div>

            {/* Filter & Search Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter by name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-blue-500 w-48 sm:w-56"
                />
              </div>

              <div className="w-44 sm:w-52">
                <Select
                  value={roleFilter}
                  onChange={(val) => setRoleFilter(val)}
                  options={[
                    { value: 'ALL', label: `All Roles (${members.length})` },
                    ...AVAILABLE_ROLES.map((r) => ({
                      value: r.role,
                      label: r.label,
                    })),
                  ]}
                  buttonClassName="py-1.5 px-2.5"
                />
              </div>

              <span className="text-[11px] font-semibold text-neutral-600 font-mono bg-white px-2.5 py-1 rounded border border-neutral-200">
                {filteredMembers.length} Enrolled
              </span>
            </div>
          </div>

          <div className="divide-y divide-neutral-100">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-neutral-500 flex items-center justify-center gap-2 font-mono">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading workspace roster...</span>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-500">
                No team members match the search query.
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isCurrentAccount = m.id === currentUser.id || m.email === currentUser.email;

                return (
                  <div
                    key={m.id || m.email}
                    className="p-fib-13 flex flex-wrap items-center justify-between gap-fib-13 hover:bg-neutral-50/80 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <Avatar name={m.name} src={m.avatarUrl} size="md" status={m.isActive ? 'online' : 'offline'} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900 block">{m.name}</span>
                          {isCurrentAccount && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-neutral-500 font-mono">{m.email}</span>
                      </div>
                    </div>

                    <div className="text-neutral-500 text-[11px] hidden md:block">
                      <span className="font-medium text-neutral-700">{m.department || 'General Sales'}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-mono">
                        {m.role.replace(/_/g, ' ')}
                      </span>
                      <span className="text-neutral-600 font-medium flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-green-600" />
                        {m.isActive !== false ? 'Active' : 'Deactivated'}
                      </span>

                      {!isCurrentAccount && (
                        <button
                          type="button"
                          onClick={() => setMemberToDelete(m)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-2"
                          title={`Remove ${m.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </WidgetBoundary>

      {/* Remove Team Member Confirmation Modal */}
      {memberToDelete && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setMemberToDelete(null);
          }}
        >
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 my-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Remove Team Member</h3>
                <p className="text-xs text-neutral-500">Revoke workspace access and permissions.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Are you sure you want to remove <strong className="text-neutral-900">{memberToDelete.name}</strong> (
              <span className="font-mono text-neutral-700">{memberToDelete.email}</span>)? They will no longer be able to log in or access tenant resources.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMemberToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteMember}
                isLoading={isDeleting}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Confirm Removal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Provision / Invite Team Member Modal */}
      {isInviteOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsInviteOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Provision New Team Member</h3>
                  <p className="text-xs text-neutral-500">Assign role permissions and generate credentials.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleInviteSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 pb-16">
              <Input
                label="Full Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Alex Henderson"
                required
              />

              <Input
                label="Work Email Address"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. alex.h@acmecorp.com"
                required
              />

              <div className="space-y-1.5">
                <Select
                  label="Role & Permission Scope"
                  value={newRole}
                  onChange={(val) => setNewRole(val as UserRole)}
                  options={AVAILABLE_ROLES.map((r) => ({
                    value: r.role,
                    label: r.label,
                    description: r.description,
                  }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Inbound Sales"
                />

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      Temporary Password
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> Auto-Generate
                    </button>
                  </div>
                  <Input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter temporary password"
                    required
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-[11px] leading-relaxed">
                  <p className="font-semibold text-blue-900">Immediate Seat Provisioning</p>
                  <p className="text-blue-800">
                    The user will be immediately authorized to sign in with this email and password to access their role dashboard.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                  icon={<UserCheck className="w-4 h-4" />}
                >
                  Create & Enroll Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
