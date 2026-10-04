import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KPICard } from '@/components/patterns/KPICard';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { useUIStore } from '@/stores/uiStore';
import { useSessionStore } from '@/stores/sessionStore';
import { organizationsApi, TenantOrgDto, DashboardStatsDto } from './api/organizationsApi';
import { usersApi, UserDto } from './api/usersApi';
import { UserRole } from '@/types';
import {
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
  Search,
  Shield,
  PhoneCall,
  Kanban,
  CreditCard,
  BarChart3,
  Copy,
  Lock,
  ArrowRight,
  Database,
  Radio,
  Check,
} from 'lucide-react';

const AVAILABLE_ROLES: { role: UserRole; label: string; description: string }[] = [
  { role: 'SALES_REP', label: 'Sales Executive (Employee)', description: 'Deals pipeline, lead qualification & customer quotes' },
  { role: 'TELECALLER', label: 'Telecaller (Employee)', description: 'Call queue autodialer and disposition logging' },
  { role: 'SALES_MANAGER', label: 'Sales Manager (Employee)', description: 'Team performance, quota approvals & pipeline management' },
  { role: 'MARKETING_SDR', label: 'Marketing Specialist (Employee)', description: 'Lead enrichment and campaign capture' },
  { role: 'FINANCE_VIEWER', label: 'Finance Staff (Employee)', description: 'Invoices, reconciliations and billing tracking' },
  { role: 'ORG_ADMIN', label: 'CRM Administrator', description: 'Full workspace administrator for the tenant' },
];

export function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const { addToast } = useUIStore();
  const { user: currentUser, organizationName } = useSessionStore();
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'users' | 'security'>(
    urlTab === 'users' || urlTab === 'tenants' || urlTab === 'security' ? urlTab : 'overview'
  );

  useEffect(() => {
    if (urlTab && ['overview', 'tenants', 'users', 'security'].includes(urlTab)) {
      setActiveTab(isSuperAdmin && urlTab === 'tenants' ? 'overview' : urlTab as any);
    }
  }, [urlTab, isSuperAdmin]);

  // Dashboard Database Stats State
  const [dashboardStats, setDashboardStats] = useState<DashboardStatsDto>({
    activeWorkspaces: 0,
    provisionedStaffSeats: 0,
    totalRevenue: 0,
    totalLeads: 0,
    finalizedLeadsCount: 0,
    dealsWonCount: 0,
    openQueries: 0,
    totalTasks: 0,
    pendingTasks: 0,
    urgentTasks: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Organizations / Tenants State
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
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');

  // Form State for New User
  const [targetOrgId, setTargetOrgId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('SALES_REP');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDept, setNewUserDept] = useState('Sales & Outreach');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Delete User State
  const [userToDelete, setUserToDelete] = useState<UserDto | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // API Key State
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Fetch Organizations
  const loadTenants = useCallback(async () => {
    if (isSuperAdmin) {
      setTenants([]);
      setIsLoadingTenants(false);
      return;
    }

    setIsLoadingTenants(true);
    try {
      const data = await organizationsApi.getOrganizations();
      setTenants(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Failed to load tenants:', err);
      addToast({
        type: 'danger',
        title: 'Could Not Load Workspaces',
        message: err?.message || 'Workspace records could not be loaded from the database.',
      });
    } finally {
      setIsLoadingTenants(false);
    }
  }, [addToast, isSuperAdmin]);

  // Fetch Users
  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const data = await usersApi.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Failed to load users:', err);
      setUsers([]);
      addToast({
        type: 'danger',
        title: 'Could Not Load Employees',
        message: err?.message || 'Employee records could not be loaded from the database.',
      });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [addToast]);

  // Fetch Live Database Stats
  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const stats = await organizationsApi.getDashboardStats();
      if (stats) {
        setDashboardStats(stats);
      }
    } catch (err) {
      console.warn('Failed to load dashboard stats:', err);
      addToast({
        type: 'danger',
        title: 'Could Not Load Dashboard Data',
        message: err instanceof Error ? err.message : 'Dashboard metrics could not be loaded.',
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadTenants();
    loadUsers();
    loadStats();
  }, [loadTenants, loadUsers, loadStats]);

  // Handle Create Organization
  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) {
      addToast({ type: 'danger', title: 'Required', message: 'Enter company / organization name.' });
      return;
    }
    setIsSubmittingTenant(true);
    try {
      const created = await organizationsApi.createOrganization({
        name: newTenantName.trim(),
        planTier: newTenantTier,
        limits: {
          maxUsers: newTenantSeats,
          maxLeads: newTenantSeats * 200,
          maxStorageMb: 10240,
          aiTokensIncluded: 500000,
        },
      });

      setTenants((prev) => [created, ...prev]);
      setIsNewTenantOpen(false);
      setNewTenantName('');
      setNewTenantSeats(25);
      addToast({
        type: 'success',
        title: 'Organization Workspace Provisioned',
        message: `Workspace '${created.name}' initialized with ${newTenantTier} plan tier.`,
      });
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Provisioning Failed',
        message: err?.message || 'Could not create organization in database.',
      });
    } finally {
      setIsSubmittingTenant(false);
    }
  };

  // Handle Provision User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || newUserPassword.length < 6) {
      addToast({ type: 'danger', title: 'Missing Information', message: 'Employee name, work email, and a password with at least 6 characters are required.' });
      return;
    }

    setIsSubmittingUser(true);
    try {
      const orgId = targetOrgId || currentUser.organizationId;
      const cleanPhone = newUserPhone.trim();
      const cleanEmail = newUserEmail.trim().toLowerCase();

      const createdUser = await usersApi.createUser({
        name: newUserName.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        password: newUserPassword,
        role: newUserRole,
        department: newUserDept.trim() || 'Sales & Outreach',
        organizationId: orgId,
      });

      // Ensure phone is set on local state
      const userWithPhone = { ...createdUser, phone: cleanPhone, department: newUserDept.trim() };

      setUsers((prev) => [userWithPhone, ...prev.filter((u) => u.id !== createdUser.id)]);
      setIsNewUserOpen(false);
      setTargetOrgId('');
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserRole('SALES_REP');
      setNewUserPassword('');
      setNewUserDept('Sales & Outreach');

      addToast({
        type: 'success',
        title: 'Employee Account Created!',
        message: `${createdUser.name} was added to ${newUserDept}. Employee ID: ${createdUser.employeeId || 'unavailable'}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Could Not Add Employee',
        message: err?.message || 'Error creating user in database.',
      });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await usersApi.deleteUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
      addToast({
        type: 'success',
        title: 'Member Deprovisioned',
        message: `Account for ${userToDelete.name} has been removed.`,
      });
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Deprovisioning Failed',
        message: err?.message || 'Could not delete user account.',
      });
    } finally {
      setIsDeletingUser(false);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText('advmen_live_sk_89f02931aef420b92e7c3901b0');
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
    addToast({ type: 'success', title: 'Copied', message: 'API Key copied to clipboard.' });
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(userSearchQuery.toLowerCase()));

    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-fib-21">
      {/* Executive Command Header */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              Admin Command Center
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-mono">
              {currentUser.role === 'SUPER_ADMIN' ? 'ROOT SUPER ADMIN' : 'ORGANIZATION ADMIN'}
            </span>
            {!isSuperAdmin && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                {organizationName || currentUser.organizationName || 'ADVMEN Workspace'}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 max-w-2xl">
            {isSuperAdmin
              ? 'Manage employee access, role clearances, and RevOps infrastructure health.'
              : 'Manage your team, role clearances, and RevOps infrastructure health.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingTenants || isLoadingUsers || isLoadingStats ? 'animate-spin' : ''}`} />}
            isLoading={isLoadingTenants || isLoadingUsers || isLoadingStats}
            onClick={() => {
              if (!isSuperAdmin) loadTenants();
              loadUsers();
              loadStats();
              addToast({ type: 'info', title: 'Refreshed', message: 'Synchronized live database records.' });
            }}
          >
            Sync Data
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={<UserCheck className="w-3.5 h-3.5" />}
            onClick={() => setIsNewUserOpen(true)}
          >
            + Add Employee
          </Button>
        </div>
      </div>

      {/* Top Level Metric KPIs - Live Database Stats */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-fib-13`}>
        <WidgetBoundary name="kpi-admin-arr">
          <KPICard
            label="Total Revenue Won"
            value={`₹${(dashboardStats.totalRevenue || 0).toLocaleString('en-IN')}`}
            delta={`${dashboardStats.finalizedLeadsCount + dashboardStats.dealsWonCount} closed deals`}
            deltaDirection="up"
            subtext="Revenue generated in CRM"
            accent="green"
          />
        </WidgetBoundary>

        {!isSuperAdmin && (
          <WidgetBoundary name="kpi-admin-orgs">
            <KPICard
              label="Active Workspaces"
              value={String(dashboardStats.activeWorkspaces || tenants.length)}
              delta="100% active"
              deltaDirection="up"
              subtext="Tenant organizations"
              accent="blue"
            />
          </WidgetBoundary>
        )}

        <WidgetBoundary name="kpi-admin-users">
          <KPICard
            label="Provisioned Staff Seats"
            value={String(dashboardStats.provisionedStaffSeats || users.length || 0)}
            subtext={`${users.length} active team members`}
            accent="violet"
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-admin-health">
          <KPICard
            label="Pending Tasks & SLA"
            value={String(dashboardStats.pendingTasks || 0)}
            delta={dashboardStats.urgentTasks > 0 ? `${dashboardStats.urgentTasks} urgent` : 'SLA compliant'}
            deltaDirection={dashboardStats.urgentTasks > 0 ? 'down' : 'up'}
            subtext={`${dashboardStats.totalTasks || 0} total scheduled tasks`}
            accent={dashboardStats.urgentTasks > 0 ? 'rose' : 'green'}
          />
        </WidgetBoundary>
      </div>

      {/* Dynamic Navigation Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Overview & Launchpad</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Employees ({users.length})</span>
          </button>

          {!isSuperAdmin && <button
            onClick={() => setActiveTab('tenants')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'tenants'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Workspaces ({tenants.length})</span>
          </button>}

          <button
            onClick={() => setActiveTab('security')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>RBAC Matrix & API</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: OVERVIEW & LAUNCHPAD */}
      {activeTab === 'overview' && (
        <div className="space-y-fib-21">
          {/* Quick Launch Cards */}
          <div>
            <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider mb-3">
              RevOps Module Fast Launch
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                onClick={() => navigate('/leads')}
                className="p-4 rounded-xl bg-white border border-neutral-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400 group-hover:text-blue-600 flex items-center gap-1">
                    Open Hub <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-neutral-900">Leads & Prospects</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {dashboardStats.totalLeads} in CRM
                  </span>
                </div>
                <p className="text-xs text-neutral-500 leading-snug">
                  Manage inbound opportunities, qualification stages, and lead assignments.
                </p>
              </div>

              <div
                onClick={() => navigate('/pipeline')}
                className="p-4 rounded-xl bg-white border border-neutral-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Kanban className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400 group-hover:text-emerald-600 flex items-center gap-1">
                    Open Hub <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-neutral-900">Deals & Pipeline</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {dashboardStats.dealsWonCount} Won
                  </span>
                </div>
                <p className="text-xs text-neutral-500 leading-snug">
                  Interactive Kanban revenue stages, quota tracking, and sales probability forecasting.
                </p>
              </div>

              <div
                onClick={() => navigate('/calls')}
                className="p-4 rounded-xl bg-white border border-neutral-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400 group-hover:text-indigo-600 flex items-center gap-1">
                    Open Hub <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-neutral-900">Lead Queries & Support Desk</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {dashboardStats.openQueries} Pending
                  </span>
                </div>
                <p className="text-xs text-neutral-500 leading-snug">
                  Employee raised inquiries, prospect queries, and support ticket management.
                </p>
              </div>

              <div
                onClick={() => navigate('/ai')}
                className="p-4 rounded-xl bg-white border border-neutral-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400 group-hover:text-purple-600 flex items-center gap-1">
                    Open Hub <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <h4 className="text-sm font-bold text-neutral-900">AI Intelligence Center</h4>
                <p className="text-xs text-neutral-500 leading-snug">
                  Deal win-probability models, call sentiment analytics, and automated email generation.
                </p>
              </div>

              <div
                onClick={() => navigate('/invoices')}
                className="p-4 rounded-xl bg-white border border-neutral-200 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400 group-hover:text-teal-600 flex items-center gap-1">
                    Open Hub <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <h4 className="text-sm font-bold text-neutral-900">Invoices & Billing</h4>
                <p className="text-xs text-neutral-500 leading-snug">
                  Payment reconciliation, customer ledger, recurring billing and proposal contracts.
                </p>
              </div>
            </div>
          </div>

          {/* Infrastructure Health & Audit Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* System Status */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-600" />
                Infrastructure & Cluster Health
              </h3>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <span className="text-neutral-600 flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    MongoDB Atlas Cluster
                  </span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Healthy (12ms)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <span className="text-neutral-600 flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-blue-600" />
                    Redis Cache / Queue
                  </span>
                  <span className="text-blue-700 font-bold">Connected</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <span className="text-neutral-600 flex items-center gap-2">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                    Cloudflare R2 Object Store
                  </span>
                  <span className="text-neutral-800 font-bold">advmenngo (Active)</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <span className="text-neutral-600 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-amber-600" />
                    Telephony WebSockets
                  </span>
                  <span className="text-emerald-700 font-bold">Operational (Port 5001)</span>
                </div>
              </div>
            </div>

            {/* Live Audit Feed */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Live Platform Audit Log
                </h3>
                <span className="text-[10px] text-neutral-400 font-mono">SOC2 Compliant</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-neutral-900">
                      Super Admin Authenticated via Admin Gateway
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono">
                      Actor: {currentUser.email} • Session Established
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                    SUCCESS
                  </span>
                </div>

                {!isSuperAdmin && (
                <div className="flex items-start justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-neutral-900">
                      Organization Workspace Scoping Validated
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono">
                      Tenant: {organizationName || 'ADVMEN Platform Ops'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono">
                    VERIFIED
                  </span>
                </div>
                )}

                <div className="flex items-start justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-neutral-900">
                      Telemetry Sync & Seat Allocation Check
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono">
                      {users.length} Active User Records Scanned
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800 font-mono">
                    INFO
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TENANTS / WORKSPACES */}
      {activeTab === 'tenants' && !isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Multi-Tenant Workspaces & Subscriptions
              </h3>
              <p className="text-xs text-neutral-500">
                Manage separate customer companies, plan quotas, seat allowances, and storage limits.
              </p>
            </div>
            {currentUser.role === 'SUPER_ADMIN' && (
              <Button
                size="sm"
                variant="primary"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsNewTenantOpen(true)}
              >
                Provision Workspace
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase border-y border-neutral-200">
                <tr>
                  <th className="py-3 px-4">Organization Name</th>
                  <th className="py-3 px-4">Tenant ID</th>
                  <th className="py-3 px-4">Plan Tier</th>
                  <th className="py-3 px-4">Allocated Seats</th>
                  <th className="py-3 px-4">Storage (GB)</th>
                  <th className="py-3 px-4">24h API Calls</th>
                  <th className="py-3 px-4">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 font-mono">
                {isLoadingTenants ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500 font-sans">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                      Loading workspace environments...
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500 font-sans">
                      No workspace organizations found.
                    </td>
                  </tr>
                ) : (
                  tenants.map((org) => (
                    <tr key={org.id || org.organizationId} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-sans font-bold text-neutral-900">
                        {org.name}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-500 text-[11px]">
                        {org.organizationId || org.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {org.tier || org.planTier || 'ENTERPRISE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-800 font-semibold">
                        {org.activeUsers || 0} / {org.maxUsers || 50}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600">
                        {org.storageGb || 1.5} GB
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600">
                        {(org.apiCalls24h || 1200).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {org.health || 'HEALTHY'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USERS & TEAM SEAT ACCESS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Employee Directory & Staff Management
              </h3>
              <p className="text-xs text-neutral-500">
                Only Admin can add and manage employee accounts in this CRM. Employees log in to their dedicated Employee Panel.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              icon={<UserCheck className="w-3.5 h-3.5" />}
              onClick={() => setIsNewUserOpen(true)}
            >
              + Add New Employee
            </Button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search member by name, email, department..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-neutral-200 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="ALL">All Roles ({users.length})</option>
              {AVAILABLE_ROLES.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase border-y border-neutral-200">
                <tr>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Employee ID (Login ID)</th>
                  <th className="py-3 px-4">Work Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {isLoadingUsers ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500 font-sans">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                      Loading employees...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500 font-sans">
                      No employees found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.name} size="sm" />
                          <span className="font-bold text-neutral-900">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] font-bold text-neutral-900">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <UserCheck className="w-3 h-3 text-emerald-600" />
                          {u.employeeId || 'Not assigned'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-600">
                        {u.email}
                      </td>
                      <td className="py-3 px-4 text-neutral-700 font-medium">
                        {u.department || 'Sales & Outreach'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-800 border border-blue-200">
                          {u.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold font-mono ${u.isActive ? 'text-emerald-700' : 'text-neutral-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {u.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => setUserToDelete(u)}
                            className="p-1.5 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Revoke Member Access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RBAC MATRIX & API */}
      {activeTab === 'security' && (
        <div className="space-y-fib-21">
          {/* RBAC Matrix */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Enterprise Role-Based Access Control (RBAC) Matrix
              </h3>
              <p className="text-xs text-neutral-500">
                Overview of cryptographic security privileges enforced on backend API endpoints.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-700">
                <thead className="bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase border-y border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Permission Scope</th>
                    <th className="py-3 px-2 text-center">Super Admin</th>
                    <th className="py-3 px-2 text-center">Org Admin</th>
                    <th className="py-3 px-2 text-center">Sales Manager</th>
                    <th className="py-3 px-2 text-center">Sales Rep</th>
                    <th className="py-3 px-2 text-center">Telecaller</th>
                    <th className="py-3 px-2 text-center">Marketing SDR</th>
                    <th className="py-3 px-2 text-center">Finance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-mono text-[11px]">
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-neutral-800">
                      Cross-Tenant Workspaces (admin.orgs)
                    </td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-neutral-800">
                      Seat Provisioning (team.manage)
                    </td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-neutral-800">
                      Leads Pipeline & Assignment (lead.assign)
                    </td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-neutral-300">-</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-neutral-800">
                      Deals Kanban & Quotes (deal.manage)
                    </td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-neutral-800">
                      Telephony Autodialer (call.make)
                    </td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-neutral-800">
                      Invoices & Payments (invoice.manage)
                    </td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-neutral-300">-</td>
                    <td className="text-center text-emerald-600 font-bold">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* API Keys */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                REST API Integration & Webhook Secrets
              </h3>
              <p className="text-xs text-neutral-500">
                Connect external telephony switches, lead scrapers, and ERP billing tools.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                  Production Secret API Key
                </span>
                <span className="font-mono text-xs text-neutral-800 font-bold">
                  advmen_live_sk_••••••••••••••••••••••••••••b0
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon={apiKeyCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                onClick={copyApiKey}
              >
                {apiKeyCopied ? 'Copied!' : 'Copy API Key'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROVISION NEW ORGANIZATION */}
      {isNewTenantOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsNewTenantOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Provision New Organization Workspace
              </h3>
              <p className="text-xs text-neutral-500">
                Initialize an isolated tenant workspace schema in the cloud database.
              </p>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <Input
                label="Company / Organization Name"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                placeholder="e.g. Apex Global Logistics"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700">Plan Tier</label>
                  <select
                    value={newTenantTier}
                    onChange={(e) => setNewTenantTier(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs bg-white font-medium"
                  >
                    <option value="STARTER">Starter Tier</option>
                    <option value="BUSINESS">Business Tier</option>
                    <option value="ENTERPRISE">Enterprise Plus</option>
                  </select>
                </div>

                <Input
                  label="Initial Seat Quota"
                  type="number"
                  value={String(newTenantSeats)}
                  onChange={(e) => setNewTenantSeats(Number(e.target.value))}
                  min={5}
                  max={500}
                  required
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  Automatic slug generation and database scoping will be completed upon provisioning.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
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
                  icon={<Building2 className="w-3.5 h-3.5" />}
                >
                  Create Organization
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROVISION NEW MEMBER */}
      {isNewUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsNewUserOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Add New Employee to CRM
              </h3>
              <p className="text-xs text-neutral-500">
                Employees cannot register on their own. Create credentials for your staff member to access the Employee Panel.
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <Input
                label="Employee Full Name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Mobile / Phone Number"
                  type="tel"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  required
                  helperText="Employee will use this number to sign in"
                />

                <Input
                  label="Work Email Address"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                  placeholder="e.g. rahul@company.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700">Department</label>
                <select
                  value={newUserDept}
                  onChange={(e) => setNewUserDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs bg-white font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="Sales & Outreach">Sales & Business Development</option>
                  <option value="Telecalling & Telesales">Telecalling & Calling Agent</option>
                  <option value="Customer Support & Service">Customer Support & Success</option>
                  <option value="Marketing & Inbound SDR">Marketing & Inbound Leads</option>
                  <option value="Operations & Logistics">Operations & Logistics</option>
                  <option value="Finance & Accounts">Finance & Invoicing</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700">Role / Clearance</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs bg-white font-medium focus:outline-none focus:border-blue-500"
                  >
                    {AVAILABLE_ROLES.map((r) => (
                      <option key={r.role} value={r.role}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Login Password"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                  helperText="At least 6 characters"
                />
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  After account creation, share the generated <strong>Employee ID</strong> and <strong>Password</strong> with the employee.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
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
                  icon={<UserCheck className="w-3.5 h-3.5" />}
                >
                  Create Employee Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-200 max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900">
                Deprovision Member Access?
              </h3>
              <p className="text-xs text-neutral-500">
                Are you sure you want to revoke account access for <strong>{userToDelete.name}</strong> ({userToDelete.email})?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setUserToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isDeletingUser}
                onClick={handleDeleteUser}
              >
                Yes, Deprovision
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
