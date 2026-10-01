import { useState, useEffect, useCallback } from 'react';
import { KPICard } from '@/components/patterns/KPICard';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { DataTable, ColumnDef } from '@/components/patterns/DataTable';
import { StatusPill } from '@/components/patterns/StatusPill';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { useUIStore } from '@/stores/uiStore';
import { useSessionStore } from '@/stores/sessionStore';
import { organizationsApi, TenantOrgDto } from '../admin/api/organizationsApi';
import { usersApi, UserDto } from '../admin/api/usersApi';
import { UserRole } from '@/types';
import {
  ShieldAlert,
  Server,
  Activity,
  HardDrive,
  Building2,
  RefreshCw,
  Plus,
  Users,
  Trash2,
  AlertTriangle,
  X,
  Sparkles,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';

const AVAILABLE_ROLES: { role: UserRole; label: string; description: string }[] = [
  { role: 'ORG_ADMIN', label: 'Organization Admin', description: 'Full workspace administrator for the tenant' },
  { role: 'SALES_MANAGER', label: 'Sales Manager', description: 'Team performance, quota approvals & pipeline management' },
  { role: 'SALES_REP', label: 'Sales Representative', description: 'Deals pipeline, lead qualification & quotes' },
  { role: 'TELECALLER', label: 'Telecaller / Outreach', description: 'Call queue autodialer and call disposition logging' },
  { role: 'MARKETING_SDR', label: 'Marketing / Inbound SDR', description: 'Lead enrichment and inbound campaign capture' },
  { role: 'FINANCE_VIEWER', label: 'Finance Viewer', description: 'Invoices, reconciliations and payment tracking' },
  { role: 'SUPER_ADMIN', label: 'Platform Super Admin', description: 'Root infrastructure and cross-tenant access' },
];

export function SuperAdminDashboard() {
  const { addToast } = useUIStore();
  const { user: currentUser } = useSessionStore();
  const [activeTab, setActiveTab] = useState<'tenants' | 'users'>('tenants');

  // Tenant Workspaces State
  const [tenants, setTenants] = useState<TenantOrgDto[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(true);
  const [isNewTenantOpen, setIsNewTenantOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantTier, setNewTenantTier] = useState<'STARTER' | 'BUSINESS' | 'ENTERPRISE'>('ENTERPRISE');
  const [newTenantSeats, setNewTenantSeats] = useState(25);
  const [isSubmittingTenant, setIsSubmittingTenant] = useState(false);

  // Users State
  const [users, setUsers] = useState<UserDto[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('ORG_ADMIN');
  const [newUserPassword, setNewUserPassword] = useState('SalesOS2026!Secure');
  const [newUserDept, setNewUserDept] = useState('Executive Operations');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Delete User State
  const [userToDelete, setUserToDelete] = useState<UserDto | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Delete Organization State
  const [orgToDelete, setOrgToDelete] = useState<TenantOrgDto | null>(null);
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);

  // Load Tenants
  const loadTenants = useCallback(async () => {
    setIsLoadingTenants(true);
    try {
      const data = await organizationsApi.getOrganizations();
      if (Array.isArray(data)) {
        setTenants(data);
        if (data.length > 0 && !targetOrgId) {
          setTargetOrgId(data[0].organizationId || data[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load tenants:', err);
      addToast({ type: 'danger', title: 'Error', message: 'Failed to load tenant workspaces.' });
    } finally {
      setIsLoadingTenants(false);
    }
  }, [addToast, targetOrgId]);

  // Load Users
  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const data = await usersApi.getUsers();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err: any) {
      console.error('Failed to load users:', err);
      addToast({ type: 'danger', title: 'Error', message: 'Failed to load platform users.' });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadTenants();
    loadUsers();
  }, [loadTenants, loadUsers]);

  // Lock background scroll when modal is active
  useEffect(() => {
    if (isNewTenantOpen || isNewUserOpen || userToDelete || orgToDelete) {
      const originalBody = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalBody;
      };
    }
  }, [isNewTenantOpen, isNewUserOpen, userToDelete, orgToDelete]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = 'Advmen';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += '!';
    setNewUserPassword(pass);
  };

  // Handle Tenant Creation
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) {
      addToast({ type: 'danger', title: 'Missing Name', message: 'Please enter a tenant workspace name.' });
      return;
    }

    setIsSubmittingTenant(true);
    try {
      const created = await organizationsApi.createOrganization({
        name: newTenantName.trim(),
        planTier: newTenantTier,
        limits: {
          maxUsers: Number(newTenantSeats) || 25,
          maxLeads: 10000,
          maxStorageMb: 10240,
          aiTokensIncluded: 250000,
        },
      });

      setTenants((prev) => [created, ...prev]);
      setIsNewTenantOpen(false);
      setNewTenantName('');
      addToast({
        type: 'success',
        title: 'Tenant Workspace Active!',
        message: `Workspace '${created.name}' initialized and ready for member enrollment.`,
      });
    } catch (err: any) {
      console.error('Failed to create tenant:', err);
      addToast({
        type: 'danger',
        title: 'Workspace Creation Failed',
        message: err?.message || 'Could not provision new tenant workspace.',
      });
    } finally {
      setIsSubmittingTenant(false);
    }
  };

  // Handle User Creation
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      addToast({ type: 'danger', title: 'Missing Details', message: 'Name and email are required.' });
      return;
    }

    setIsSubmittingUser(true);
    try {
      const createdUser = await usersApi.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        password: newUserPassword,
        role: newUserRole,
        department: newUserDept.trim() || 'Operations',
        organizationId: targetOrgId || tenants[0]?.organizationId || tenants[0]?.id,
      });

      setUsers((prev) => [createdUser, ...prev.filter((u) => u.id !== createdUser.id)]);
      setIsNewUserOpen(false);

      // Reset form
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('ORG_ADMIN');
      setNewUserPassword('SalesOS2026!Secure');
      setNewUserDept('Executive Operations');

      addToast({
        type: 'success',
        title: 'User Account Provisioned!',
        message: `Successfully provisioned ${createdUser.name} (${createdUser.email}) with ${createdUser.role.replace(/_/g, ' ')} permissions. Ready for login.`,
      });

      // Refresh tenants to update user counts
      loadTenants();
    } catch (err: any) {
      console.error('Failed to provision user:', err);
      addToast({
        type: 'danger',
        title: 'User Provisioning Failed',
        message: err?.message || 'Could not provision user.',
      });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Handle User Deletion
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await usersApi.deleteUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      addToast({
        type: 'success',
        title: 'User Removed',
        message: `Account for ${userToDelete.name} has been removed.`,
      });
      setUserToDelete(null);
      loadTenants();
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      addToast({
        type: 'danger',
        title: 'Deletion Failed',
        message: err?.message || 'Failed to remove user account.',
      });
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Handle Organization Deletion
  const handleDeleteOrg = async () => {
    if (!orgToDelete) return;
    setIsDeletingOrg(true);
    const targetId = orgToDelete.organizationId || orgToDelete.id;
    try {
      await organizationsApi.deleteOrganization(targetId);
      setTenants((prev) => prev.filter((t) => (t.organizationId || t.id) !== targetId));
      addToast({
        type: 'success',
        title: 'Workspace Deleted',
        message: `Tenant workspace '${orgToDelete.name}' and all associated records have been removed.`,
      });
      setOrgToDelete(null);
      if (targetOrgId === targetId) {
        setTargetOrgId('');
      }
      loadTenants();
      loadUsers();
    } catch (err: any) {
      console.error('Failed to delete organization:', err);
      addToast({
        type: 'danger',
        title: 'Deletion Failed',
        message: err?.message || 'Failed to delete tenant workspace.',
      });
    } finally {
      setIsDeletingOrg(false);
    }
  };

  const tenantColumns: ColumnDef<TenantOrgDto>[] = [
    {
      id: 'name',
      header: 'Tenant Organization',
      cell: ({ row }) => (
        <div className="flex items-center gap-fib-8">
          <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-neutral-900 block">{row.name}</span>
            <span className="text-[10px] text-neutral-500 font-mono">ID: {row.organizationId || row.id}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'tier',
      header: 'Plan Tier',
      cell: ({ row }) => (
        <span className="text-[10px] font-bold px-fib-8 py-0.5 rounded-pill bg-violet-50 text-violet-800 border border-violet-200 font-mono">
          {row.tier || row.planTier || 'ENTERPRISE'}
        </span>
      ),
    },
    {
      id: 'seats',
      header: 'Seat Utilization',
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-neutral-800">
          {row.activeUsers} / {row.maxUsers} ({Math.round(((row.activeUsers || 0) / (row.maxUsers || 1)) * 100)}%)
        </span>
      ),
    },
    {
      id: 'apiCalls',
      header: '24h API Volume',
      align: 'right',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold tabular-nums text-neutral-900">
          {(row.apiCalls24h || 0).toLocaleString()} req
        </span>
      ),
    },
    {
      id: 'health',
      header: 'VPC Health',
      cell: ({ row }) => (
        <StatusPill
          label={row.health || 'HEALTHY'}
          variant={row.health === 'HEALTHY' ? 'success' : row.health === 'WARNING' ? 'warning' : 'danger'}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Action',
      align: 'right',
      cell: ({ row }) => {
        const isRoot = (row.organizationId || row.id) === 'org_advmen_platform';

        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="xs"
              variant="secondary"
              onClick={() => {
                setTargetOrgId(row.organizationId || row.id);
                setIsNewUserOpen(true);
              }}
            >
              + Add Member
            </Button>
            {!isRoot && (
              <button
                type="button"
                onClick={() => setOrgToDelete(row)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title={`Delete workspace ${row.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-fib-21">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-fib-13 pb-fib-8 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-fib-8 mb-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
              Super Admin — Platform Infrastructure Command
            </h1>
            <span className="text-[10px] font-bold px-fib-8 py-0.5 rounded-pill bg-violet-100 text-violet-800 border border-violet-300 font-mono">
              Root Level
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Multi-tenant cluster health, cross-organization provisioning, user lifecycle, and zero-trust RBAC management.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingTenants || isLoadingUsers ? 'animate-spin' : ''}`} />}
            onClick={() => {
              loadTenants();
              loadUsers();
            }}
          >
            Sync Telemetry
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<Building2 className="w-3.5 h-3.5 text-blue-600" />}
            onClick={() => setIsNewTenantOpen(true)}
          >
            + Create Tenant Workspace
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<UserCheck className="w-3.5 h-3.5" />}
            onClick={() => setIsNewUserOpen(true)}
          >
            + Provision User / Admin
          </Button>
        </div>
      </div>

      {/* KPI Tiles Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-fib-13">
        <WidgetBoundary name="kpi-active-tenants">
          <KPICard
            label="Total Active Tenants"
            value={tenants.length}
            delta={`${tenants.length} Workspaces Active`}
            deltaDirection="up"
            accent="blue"
            icon={<Server className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-total-users">
          <KPICard
            label="Total Enrolled Users"
            value={users.length}
            delta="Cross-tenant Roster"
            deltaDirection="up"
            accent="green"
            icon={<Users className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-api-throughput">
          <KPICard
            label="Tenant Cluster Health"
            value={`${tenants.length ? Math.round((tenants.filter((t) => (t.health || 'HEALTHY') === 'HEALTHY').length / tenants.length) * 100) : 100}%`}
            subtext={`${tenants.filter((t) => (t.health || 'HEALTHY') === 'HEALTHY').length} of ${tenants.length} Operational`}
            accent="violet"
            icon={<Activity className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-storage-utilization">
          <KPICard
            label="Encrypted Audio Storage"
            value={`${tenants.reduce((sum, t) => sum + (t.storageGb || 0), 0)} GB`}
            subtext="AES-256 Vault"
            accent="neutral"
            icon={<HardDrive className="w-4 h-4" />}
          />
        </WidgetBoundary>
      </div>

      {/* System Alert Banner */}
      <div className="p-fib-13 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between text-xs text-blue-950">
        <div className="flex items-center gap-fib-8">
          <ShieldAlert className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Zero-Trust Authorization Matrix:</strong> All platform roles are persisted in MongoDB and enforced via cryptographic token scopes.
          </span>
        </div>
        <span className="text-[11px] font-mono font-bold bg-white px-fib-8 py-0.5 rounded border border-blue-200">
          TLS 1.3 / AES-256
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'tenants'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Tenant Organizations ({tenants.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Users className="w-4 h-4" />
          All Platform Users ({users.length})
        </button>
      </div>

      {/* Tab 1: Tenants Table */}
      {activeTab === 'tenants' && (
        <WidgetBoundary name="tenants-cluster-table">
          <DataTable
            columns={tenantColumns}
            data={tenants}
            keyExtractor={(t) => t.id || t.organizationId}
            searchPlaceholder="Search tenant organizations by name or ID..."
          />
        </WidgetBoundary>
      )}

      {/* Tab 2: Users Management Table */}
      {activeTab === 'users' && (
        <WidgetBoundary name="superadmin-users-table">
          <div className="skeuo-raised-2 bg-white rounded-md border border-neutral-200 overflow-hidden shadow-sm">
            <div className="p-fib-13 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Cross-Tenant User Roster & Account Access
                </h3>
                <p className="text-[11px] text-neutral-500">
                  All provisioned accounts with direct database persistence and login capability.
                </p>
              </div>
              <Button
                size="xs"
                variant="primary"
                icon={<Plus className="w-3 h-3" />}
                onClick={() => setIsNewUserOpen(true)}
              >
                Provision User
              </Button>
            </div>

            <div className="divide-y divide-neutral-100">
              {isLoadingUsers ? (
                <div className="p-8 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Loading user roster...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">No users found.</div>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentUser.id || u.email === currentUser.email;

                  return (
                    <div
                      key={u.id || u.email}
                      className="p-fib-13 flex flex-wrap items-center justify-between gap-fib-13 hover:bg-neutral-50/80 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-[240px]">
                        <Avatar name={u.name} src={u.avatarUrl} size="md" status={u.isActive ? 'online' : 'offline'} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900">{u.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-violet-100 text-violet-800 font-mono">
                                ROOT
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-neutral-500 font-mono block">{u.email}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">Tenant: {u.organizationId}</span>
                        </div>
                      </div>

                      <div className="text-neutral-500 text-[11px]">
                        <span className="font-medium text-neutral-700">{u.department || 'Operations'}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-mono">
                          {u.role.replace(/_/g, ' ')}
                        </span>
                        <span className="text-neutral-600 font-medium flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-green-600" />
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>

                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-2"
                            title={`Remove ${u.name}`}
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
      )}

      {/* Modal: Create Active Tenant Workspace */}
      {isNewTenantOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingTenant) setIsNewTenantOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-lg sm:w-[512px] max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 my-auto">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Create Tenant Workspace</h3>
                  <p className="text-xs text-neutral-500">Provision a dedicated multi-tenant workspace.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTenantOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="p-6 space-y-4 overflow-y-auto flex-1">
              <Input
                label="Organization Workspace Name"
                placeholder="e.g. Apex Global Logistics"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Select
                    label="Plan Tier"
                    value={newTenantTier}
                    onChange={(val) => setNewTenantTier(val as any)}
                    options={[
                      { value: 'STARTER', label: 'Starter Plan' },
                      { value: 'BUSINESS', label: 'Business Plan' },
                      { value: 'ENTERPRISE', label: 'Enterprise Plan' },
                    ]}
                  />
                </div>

                <Input
                  label="Licensed Seat Limit"
                  type="number"
                  min={1}
                  max={500}
                  value={newTenantSeats}
                  onChange={(e) => setNewTenantSeats(Number(e.target.value))}
                  required
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-50 text-xs text-blue-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Instant cryptographic isolation, database scoping & telemetry will be enabled.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsNewTenantOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingTenant}
                  icon={<Building2 className="w-4 h-4" />}
                >
                  Create Workspace
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Provision User Across Workspaces */}
      {isNewUserOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingUser) setIsNewUserOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-lg sm:w-[512px] max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 my-auto">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Provision User / Admin</h3>
                  <p className="text-xs text-neutral-500">Create new user with direct login credentials.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewUserOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 overflow-y-auto flex-1 pb-16">
              <div className="space-y-1">
                <Select
                  label="Target Tenant Workspace"
                  value={targetOrgId}
                  onChange={(val) => setTargetOrgId(val)}
                  options={tenants.map((t) => ({
                    value: t.organizationId || t.id,
                    label: `${t.name} (${t.organizationId || t.id})`,
                  }))}
                />
              </div>

              <Input
                label="Full Name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="e.g. Marcus Vance"
                required
              />

              <Input
                label="Work Email Address"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="e.g. marcus@company.com"
                required
              />

              <div className="space-y-1">
                <Select
                  label="Role & Permission Matrix"
                  value={newUserRole}
                  onChange={(val) => setNewUserRole(val as UserRole)}
                  options={AVAILABLE_ROLES.map((r) => ({
                    value: r.role,
                    label: `${r.label} (${r.role})`,
                    description: r.description,
                  }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Department"
                  value={newUserDept}
                  onChange={(e) => setNewUserDept(e.target.value)}
                  placeholder="e.g. Sales Ops"
                />

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-neutral-700">Password</label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> Auto-Gen
                    </button>
                  </div>
                  <Input
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsNewUserOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmittingUser}
                  icon={<UserCheck className="w-4 h-4" />}
                >
                  Create & Authorize
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete User Confirmation */}
      {userToDelete && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingUser) setUserToDelete(null);
          }}
        >
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 my-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Delete User Account</h3>
                <p className="text-xs text-neutral-500">Root-level account revocation.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Are you sure you want to remove <strong className="text-neutral-900">{userToDelete.name}</strong> (
              <span className="font-mono text-neutral-700">{userToDelete.email}</span>)?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteUser}
                isLoading={isDeletingUser}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Delete Tenant Organization Confirmation */}
      {orgToDelete && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingOrg) setOrgToDelete(null);
          }}
        >
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 my-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Delete Tenant Workspace</h3>
                <p className="text-xs text-neutral-500">Irreversible workspace decommissioning.</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-neutral-600 leading-relaxed">
              <p>
                Are you sure you want to permanently delete <strong className="text-neutral-900">{orgToDelete.name}</strong> (
                <span className="font-mono text-neutral-700">{orgToDelete.organizationId || orgToDelete.id}</span>)?
              </p>
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-800 space-y-1">
                <span className="font-bold block">⚠️ Cascade Data Deletion Warning:</span>
                <span>
                  All enrolled team members, active leads, pipeline deals, tasks, calls, and invoices associated with this workspace will be permanently erased.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setOrgToDelete(null)}
                disabled={isDeletingOrg}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteOrg}
                isLoading={isDeletingOrg}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Delete Workspace
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
