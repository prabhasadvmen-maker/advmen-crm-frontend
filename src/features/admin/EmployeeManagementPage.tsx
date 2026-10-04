import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { SlideOverPanel } from '@/components/patterns/SlideOverPanel';
import { useUIStore } from '@/stores/uiStore';
import { useSessionStore } from '@/stores/sessionStore';
import { UserRole, Lead } from '@/types';
import { usersApi, UserDto } from './api/usersApi';
import { leadApi } from '@/features/leads/api/leadApi';
import {
  Users,
  UserCheck,
  UserPlus,
  Phone,
  Mail,
  Search,
  RefreshCw,
  Trash2,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Briefcase,
  Sparkles,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AVAILABLE_ROLES: { role: UserRole; label: string; description: string }[] = [
  { role: 'SALES_REP', label: 'Sales Representative (Executive)', description: 'Manages sales deals, leads, quotes and client pipelines.' },
  { role: 'TELECALLER', label: 'Telecaller / Outreach Agent', description: 'Autodialer queue, calling contacts, disposition logging.' },
  { role: 'SALES_MANAGER', label: 'Sales Manager', description: 'Team leaderboards, lead quota approvals, sales performance.' },
  { role: 'MARKETING_SDR', label: 'Marketing / Inbound SDR', description: 'Lead generation, campaign imports, and early qualification.' },
  { role: 'FINANCE_VIEWER', label: 'Finance Viewer', description: 'View invoices, payment reconciliations, and revenue ledger.' },
  { role: 'ORG_ADMIN', label: 'Workspace Administrator', description: 'Full CRM administration, user provisioning, system configuration.' },
];

export function EmployeeManagementPage() {
  const { addToast } = useUIStore();
  const { user: currentUser, organizationId } = useSessionStore();

  // State
  const [employees, setEmployees] = useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Unassigned leads summary
  const [unassignedSummary, setUnassignedSummary] = useState<{ total: number; unassignedIds: string[] }>({
    total: 0,
    unassignedIds: [],
  });

  // Add Employee Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('SALES_REP');
  const [newPassword, setNewPassword] = useState('');
  const [department, setDepartment] = useState('Sales & Business Development');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Single Employee Assign Modal
  const [targetEmployeeForAssign, setTargetEmployeeForAssign] = useState<UserDto | null>(null);
  const [assignQuantityInput, setAssignQuantityInput] = useState<number>(10);
  const [isAssigningQuantity, setIsAssigningQuantity] = useState(false);

  // View Employee Leads Drawer
  const [viewLeadsEmployee, setViewLeadsEmployee] = useState<UserDto | null>(null);
  const [employeeLeads, setEmployeeLeads] = useState<Lead[]>([]);
  const [isLoadingEmployeeLeads, setIsLoadingEmployeeLeads] = useState(false);

  // Full Distribute Modal
  const [isFullDistributeOpen, setIsFullDistributeOpen] = useState(false);
  const [distributeMethod, setDistributeMethod] = useState<'custom_quota' | 'round_robin'>('custom_quota');
  const [quotas, setQuotas] = useState<Record<string, number>>({});
  const [selectedRepIds, setSelectedRepIds] = useState<string[]>([]);
  const [isExecutingDistribute, setIsExecutingDistribute] = useState(false);

  // Delete User Modal
  const [userToDelete, setUserToDelete] = useState<UserDto | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    addToast({
      type: 'info',
      title: 'Copied',
      message: `${text} copied to clipboard.`,
    });
  };

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersData, summary] = await Promise.all([
        usersApi.getUsers(organizationId ? { organizationId } : undefined),
        leadApi.getUnassignedSummary().catch(() => ({ total: 0, unassignedIds: [] })),
      ]);

      if (Array.isArray(usersData)) {
        setEmployees(usersData);
        // Pre-fill quotas
        const initialQuotas: Record<string, number> = {};
        const activeStaff = usersData.filter((u) => u.isActive && u.role !== 'SUPER_ADMIN');
        if (activeStaff.length > 0 && summary.total > 0) {
          const perStaff = Math.floor(summary.total / activeStaff.length);
          activeStaff.forEach((s) => {
            initialQuotas[s.id] = perStaff;
          });
        }
        setQuotas(initialQuotas);
        setSelectedRepIds(activeStaff.map((s) => s.id));
      }
      setUnassignedSummary(summary);
    } catch (err: any) {
      console.error('Failed to load employee directory:', err);
      addToast({
        type: 'danger',
        title: 'Error Loading Staff',
        message: err?.message || 'Could not fetch employees from database.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast, organizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Leads for a specific employee
  const handleOpenViewLeads = async (employee: UserDto) => {
    setViewLeadsEmployee(employee);
    setIsLoadingEmployeeLeads(true);
    try {
      const res = await leadApi.getPaginatedLeads({ ownerId: employee.id, limit: 100 });
      setEmployeeLeads(res.leads);
    } catch (err: any) {
      console.error('Failed to load employee leads:', err);
      setEmployeeLeads([]);
    } finally {
      setIsLoadingEmployeeLeads(false);
    }
  };

  // Submit Add Employee
  const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || newPassword.length < 6) {
      addToast({
        type: 'warning',
        title: 'Required Fields Missing',
        message: 'Please provide employee name, email, and a password with at least 6 characters.',
      });
      return;
    }

    setIsSubmittingUser(true);
    try {
      const created = await usersApi.createUser({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        phone: newPhone.trim() || undefined,
        password: newPassword,
        role: newRole,
        department: department.trim() || 'Sales Operations',
        organizationId: organizationId || currentUser?.organizationId || '',
      });

      setEmployees((prev) => [created, ...prev.filter((e) => e.id !== created.id)]);
      setIsAddModalOpen(false);

      // Reset
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewRole('SALES_REP');
      setNewPassword('');
      setDepartment('Sales & Business Development');

      addToast({
        type: 'success',
        title: 'Employee Account Created',
        message: `${created.name} was added. Employee ID: ${created.employeeId || 'unavailable'}; share the ID and password for login.`,
      });
      loadData();
    } catch (err: any) {
      console.error('Failed to provision user:', err);
      addToast({
        type: 'danger',
        title: 'Could Not Create Account',
        message: err?.message || 'Error creating user in database.',
      });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Submit Single Employee Lead Quantity Assignment
  const handleAssignQuantitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmployeeForAssign) return;

    if (assignQuantityInput <= 0) {
      addToast({
        type: 'warning',
        title: 'Invalid Quantity',
        message: 'Please specify at least 1 lead to assign.',
      });
      return;
    }

    if (unassignedSummary.total === 0) {
      addToast({
        type: 'warning',
        title: 'No Unassigned Leads',
        message: 'There are currently 0 unassigned leads in the workspace database.',
      });
      return;
    }

    setIsAssigningQuantity(true);
    try {
      const res = await leadApi.distributeQuantity(targetEmployeeForAssign.id, assignQuantityInput);
      addToast({
        type: 'success',
        title: 'Leads Assigned Successfully',
        message: `${res.assignedCount} leads assigned to ${targetEmployeeForAssign.name}.`,
      });
      setTargetEmployeeForAssign(null);
      loadData();
    } catch (err: any) {
      console.error('Failed to assign quantity:', err);
      addToast({
        type: 'danger',
        title: 'Assignment Failed',
        message: err?.message || 'Could not assign leads.',
      });
    } finally {
      setIsAssigningQuantity(false);
    }
  };

  // Submit Full Distribute Wizard
  const handleExecuteFullDistribute = async () => {
    if (unassignedSummary.total === 0) {
      addToast({
        type: 'warning',
        title: 'No Leads to Distribute',
        message: 'There are no unassigned leads available in database.',
      });
      return;
    }

    setIsExecutingDistribute(true);
    try {
      if (distributeMethod === 'round_robin') {
        if (!selectedRepIds.length) {
          addToast({
            type: 'warning',
            title: 'Select Staff Members',
            message: 'Please select at least 1 employee to divide leads among.',
          });
          setIsExecutingDistribute(false);
          return;
        }

        const res = await leadApi.distributeEvenly(unassignedSummary.unassignedIds, selectedRepIds);
        addToast({
          type: 'success',
          title: 'Round-Robin Completed',
          message: `${res.assignedCount} leads distributed equally among ${selectedRepIds.length} employees.`,
        });
      } else {
        // Custom quotas
        const distribution: Array<{ employeeId: string; leadIds: string[] }> = [];
        let offset = 0;

        for (const emp of employees) {
          const quota = Number(quotas[emp.id]) || 0;
          if (quota > 0) {
            const chunk = unassignedSummary.unassignedIds.slice(offset, offset + quota);
            if (chunk.length > 0) {
              distribution.push({ employeeId: emp.id, leadIds: chunk });
              offset += chunk.length;
            }
          }
        }

        if (!distribution.length) {
          addToast({
            type: 'warning',
            title: 'No Quota Specified',
            message: 'Please enter how many leads to give to at least 1 employee.',
          });
          setIsExecutingDistribute(false);
          return;
        }

        const res = await leadApi.distributeCustom(distribution);
        addToast({
          type: 'success',
          title: 'Custom Leads Distributed',
          message: `${res.assignedCount} leads assigned across your team as per custom counts.`,
        });
      }

      setIsFullDistributeOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Failed to distribute leads:', err);
      addToast({
        type: 'danger',
        title: 'Distribution Failed',
        message: err?.message || 'Could not complete lead distribution.',
      });
    } finally {
      setIsExecutingDistribute(false);
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await usersApi.deleteUser(userToDelete.id);
      setEmployees((prev) => prev.filter((u) => u.id !== userToDelete.id));
      addToast({
        type: 'success',
        title: 'Employee Removed',
        message: `${userToDelete.name} has been revoked from workspace.`,
      });
      setUserToDelete(null);
      loadData();
    } catch (err: any) {
      console.error('Failed to remove user:', err);
      addToast({
        type: 'danger',
        title: 'Deletion Failed',
        message: err?.message || 'Could not remove employee account.',
      });
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Filtered Roster
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.employeeId && e.employeeId.toLowerCase().includes(q)) ||
        (e.phone && e.phone.includes(q)) ||
        (e.department && e.department.toLowerCase().includes(q));

      const matchesRole = roleFilter === 'ALL' || e.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [employees, searchQuery, roleFilter]);

  // Aggregate stats
  const totalAssignedLeads = useMemo(() => {
    return employees.reduce((sum, e) => sum + (Number(e.assignedLeadsCount) || 0), 0);
  }, [employees]);

  const activeStaffCount = useMemo(() => {
    return employees.filter((e) => e.isActive && e.role !== 'SUPER_ADMIN').length;
  }, [employees]);

  const totalQuotaAllocated = useMemo(() => {
    return Object.values(quotas).reduce((sum, val) => sum + (Number(val) || 0), 0);
  }, [quotas]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-white/5 transform skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 border border-white/15">
              <UserCheck className="w-3.5 h-3.5 text-blue-300" />
              <span>Dedicated Staff Governance & Lead Distribution</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Employee Management
            </h1>
            <p className="text-sm text-blue-100 max-w-2xl">
              Add employee accounts, view contact details, track assigned leads in MongoDB, and distribute incoming leads to your team with custom quantities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              icon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={() => loadData()}
              disabled={isLoading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Refresh
            </Button>

            <Button
              variant="secondary"
              size="md"
              icon={<Share2 className="w-4 h-4 text-amber-300" />}
              onClick={() => setIsFullDistributeOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-neutral-900 font-bold border-none shadow-md"
            >
              Distribute Leads ({unassignedSummary.total} Available)
            </Button>

            <Button
              variant="primary"
              size="md"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => setIsAddModalOpen(true)}
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-md"
            >
              + Add Employee
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              Total Enrolled Staff
            </span>
            <span className="text-2xl font-extrabold text-neutral-900 mt-1 block">
              {employees.length}
            </span>
            <span className="text-[11px] text-neutral-400 mt-0.5 block font-mono">
              Accounts in Database
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              Active Sales Reps
            </span>
            <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
              {activeStaffCount}
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">
              Ready for lead distribution
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              Leads Assigned to Staff
            </span>
            <span className="text-2xl font-extrabold text-indigo-700 mt-1 block">
              {totalAssignedLeads}
            </span>
            <span className="text-[11px] text-neutral-400 mt-0.5 block font-mono">
              Across active team
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
              Unassigned Leads Queue
            </span>
            <span className="text-2xl font-extrabold text-amber-600 mt-1 block">
              {unassignedSummary.total}
            </span>
            <span className="text-[11px] text-amber-700 font-medium mt-0.5 block">
              Waiting for assignment
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Roster Panel */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 bg-neutral-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by employee name, mobile, email, department..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-300 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-neutral-300 text-xs font-medium text-neutral-700 focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="ALL">All Roles ({employees.length})</option>
              {AVAILABLE_ROLES.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label}
                </option>
              ))}
            </select>

            <span className="text-xs font-bold text-neutral-600 px-3 py-2 rounded-xl bg-neutral-100 font-mono">
              {filteredEmployees.length} Showing
            </span>
          </div>
        </div>

        {/* Employee Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-700">
            <thead className="bg-neutral-50 text-[11px] font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-4">Employee Details</th>
                <th className="py-3.5 px-4">Employee ID (Login ID)</th>
                <th className="py-3.5 px-4">Work Email</th>
                <th className="py-3.5 px-4">Role & Department</th>
                <th className="py-3.5 px-4 text-center">Assigned Leads</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500 font-sans">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading live employee directory from database...</span>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500 font-sans">
                    <Users className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <p className="font-semibold text-neutral-700">No employees match your filter.</p>
                    <p className="text-xs text-neutral-400 mt-1">Try changing the search query or role filter.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isCurrent = (currentUser && emp.id === currentUser.id) || (currentUser && emp.email === currentUser.email);

                  return (
                    <tr key={emp.id} className="hover:bg-neutral-50/80 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={emp.name} src={emp.avatarUrl} size="md" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900 text-sm">{emp.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-neutral-400 block font-mono">
                              ID: {emp.id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID / Login ID */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-xs font-bold">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{emp.employeeId || emp.id.slice(-6)}</span>
                          <button
                            onClick={() => handleCopy(emp.employeeId || emp.id.slice(-6), `employee_${emp.id}`)}
                            className="p-1 hover:text-emerald-950 text-emerald-600 rounded transition-colors ml-0.5"
                            title="Copy employee login ID"
                          >
                            {copiedId === `employee_${emp.id}` ? (
                              <Check className="w-3 h-3 text-emerald-700" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-600">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{emp.email}</span>
                        </div>
                      </td>

                      {/* Role & Department */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-800 border border-blue-200">
                            {emp.role.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] text-neutral-500 block">
                            {emp.department || 'Sales Operations'}
                          </span>
                        </div>
                      </td>

                      {/* Assigned Leads Count */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                            {emp.assignedLeadsCount || 0} Leads
                          </span>
                          <button
                            onClick={() => handleOpenViewLeads(emp)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline mt-1"
                          >
                            View Leads
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${emp.isActive ? 'text-emerald-700' : 'text-neutral-500'}`}>
                          <span className={`w-2 h-2 rounded-full ${emp.isActive ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/attendance?search=${encodeURIComponent(emp.employeeId || emp.name)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            title="View complete login/logout times and attendance"
                          >
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Logins & Attendance</span>
                          </Link>

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setTargetEmployeeForAssign(emp);
                              setAssignQuantityInput(Math.min(10, unassignedSummary.total || 10));
                            }}
                            className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200"
                            icon={<Share2 className="w-3.5 h-3.5" />}
                          >
                            Assign Leads
                          </Button>

                          {!isCurrent && emp.role !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() => setUserToDelete(emp)}
                              className="p-2 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title={`Revoke ${emp.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD NEW EMPLOYEE */}
      <SlideOverPanel
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Employee"
        subtitle="Provision an employee account in MongoDB. A unique Employee ID is generated for sign-in."
        width="lg"
      >
        <form onSubmit={handleAddEmployeeSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-800 block mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Mobile Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Employee ID is generated automatically and is used with the password to sign in.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Work Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. rahul@company.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Role *
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs font-medium focus:outline-none focus:border-blue-500 bg-white"
              >
                {AVAILABLE_ROLES.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Sales & Business Development"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-neutral-800">
                Initial Password *
              </label>
              <button
                type="button"
                onClick={() => setNewPassword(`Advmen${Math.floor(1000 + Math.random() * 9000)}!`)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
              >
                Auto-generate
              </button>
            </div>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="pt-3 border-t border-neutral-200 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingUser}
            >
              {isSubmittingUser ? 'Provisioning...' : 'Create Employee Account'}
            </Button>
          </div>
        </form>
      </SlideOverPanel>

      {/* MODAL 2: ASSIGN QUANTITY TO SINGLE EMPLOYEE */}
      <SlideOverPanel
        isOpen={!!targetEmployeeForAssign}
        onClose={() => setTargetEmployeeForAssign(null)}
        title={`Assign Leads to ${targetEmployeeForAssign?.name || 'Employee'}`}
        subtitle="Choose how many unassigned leads from the database to assign directly to this employee."
        width="md"
      >
        {targetEmployeeForAssign && (
          <form onSubmit={handleAssignQuantitySubmit} className="space-y-5">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-900 block">Available Unassigned Leads</span>
                <span className="text-2xl font-extrabold text-blue-700 font-mono">
                  {unassignedSummary.total} Leads
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-blue-800 font-medium block">Employee Role</span>
                <span className="text-xs font-bold text-blue-950 font-mono">
                  {targetEmployeeForAssign.role.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1.5">
                Number of Leads to Assign *
              </label>
              <input
                type="number"
                min="1"
                max={unassignedSummary.total || 1000}
                required
                value={assignQuantityInput}
                onChange={(e) => setAssignQuantityInput(Number(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 text-lg font-bold font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Quick preset chips */}
            <div>
              <span className="text-[11px] font-semibold text-neutral-500 block mb-2">
                Quick Selection Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 20, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAssignQuantityInput(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono border transition-colors ${
                      assignQuantityInput === preset
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                    }`}
                  >
                    {preset} Leads
                  </button>
                ))}
                {unassignedSummary.total > 0 && (
                  <button
                    type="button"
                    onClick={() => setAssignQuantityInput(unassignedSummary.total)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                  >
                    All Available ({unassignedSummary.total})
                  </button>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-1">
              <p className="font-semibold text-neutral-900">Summary of Action:</p>
              <p>
                Taking the next <strong className="text-blue-600">{assignQuantityInput} unassigned leads</strong> from the workspace database and assigning them to <strong className="text-neutral-900">{targetEmployeeForAssign.name}</strong>.
              </p>
            </div>

            <div className="pt-3 border-t border-neutral-200 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTargetEmployeeForAssign(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isAssigningQuantity || unassignedSummary.total === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {isAssigningQuantity
                  ? 'Assigning Leads...'
                  : `Assign ${assignQuantityInput} Leads to ${targetEmployeeForAssign.name}`}
              </Button>
            </div>
          </form>
        )}
      </SlideOverPanel>

      {/* MODAL 3: VIEW EMPLOYEE ASSIGNED LEADS */}
      <SlideOverPanel
        isOpen={!!viewLeadsEmployee}
        onClose={() => setViewLeadsEmployee(null)}
        title={`Leads Assigned to ${viewLeadsEmployee?.name || 'Employee'}`}
        subtitle={`Showing live leads assigned to ${viewLeadsEmployee?.name} in MongoDB.`}
        width="xl"
      >
        {viewLeadsEmployee && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="flex items-center gap-3">
                <Avatar name={viewLeadsEmployee.name} size="sm" />
                <div>
                  <span className="font-bold text-neutral-900 text-xs block">{viewLeadsEmployee.name}</span>
                  <span className="text-[11px] text-neutral-500 font-mono">{viewLeadsEmployee.phone} • {viewLeadsEmployee.email}</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 font-mono">
                {employeeLeads.length} Leads
              </span>
            </div>

            {isLoadingEmployeeLeads ? (
              <div className="py-12 text-center text-neutral-500 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                <span>Loading leads from database...</span>
              </div>
            ) : employeeLeads.length === 0 ? (
              <div className="py-12 text-center text-neutral-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="font-semibold text-neutral-700">No leads currently assigned to this employee.</p>
                <p className="text-neutral-400 mt-1">Use the "Assign Leads" button to assign leads.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden max-h-[450px] overflow-y-auto">
                {employeeLeads.map((lead) => (
                  <div key={lead.id} className="p-3.5 hover:bg-neutral-50 flex items-center justify-between text-xs gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900">{lead.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-neutral-100 text-neutral-700">
                          {lead.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500 block mt-0.5 font-mono">
                        {lead.company || 'Enterprise'} • {lead.phone}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-neutral-900 font-mono block">
                        ₹{(lead.estimatedValue || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        Score: {lead.score} ({lead.scoreCategory})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-neutral-200 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setViewLeadsEmployee(null)}
              >
                Close
              </Button>
              <Link to="/leads">
                <Button variant="primary">
                  Go to Leads Hub
                </Button>
              </Link>
            </div>
          </div>
        )}
      </SlideOverPanel>

      {/* MODAL 4: TEAM-WIDE DISTRIBUTE WIZARD */}
      <SlideOverPanel
        isOpen={isFullDistributeOpen}
        onClose={() => setIsFullDistributeOpen(false)}
        title="Distribute Leads to Team"
        subtitle="Divide incoming unassigned leads across sales executives either by custom quota or equal round-robin."
        width="xl"
      >
        <div className="space-y-5">
          {/* Header Stats */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-900 block">Total Unassigned Leads in Database</span>
              <span className="text-2xl font-extrabold text-amber-700 font-mono">
                {unassignedSummary.total} Leads
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-neutral-600 block">Allocated:</span>
              <span className="text-lg font-bold font-mono text-neutral-900">
                {distributeMethod === 'custom_quota' ? totalQuotaAllocated : unassignedSummary.total} / {unassignedSummary.total}
              </span>
            </div>
          </div>

          {/* Method Tabs */}
          <div className="flex border-b border-neutral-200">
            <button
              onClick={() => setDistributeMethod('custom_quota')}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
                distributeMethod === 'custom_quota'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Option 1: Custom Quota per Employee
            </button>
            <button
              onClick={() => setDistributeMethod('round_robin')}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
                distributeMethod === 'round_robin'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Option 2: Equal Split / Round-Robin
            </button>
          </div>

          {/* Mode 1: Custom Quota */}
          {distributeMethod === 'custom_quota' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-500">
                Specify exactly how many leads each employee should receive:
              </p>

              <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                {employees
                  .filter((e) => e.isActive && e.role !== 'SUPER_ADMIN')
                  .map((emp) => (
                    <div key={emp.id} className="p-3 flex items-center justify-between gap-4 bg-white hover:bg-neutral-50">
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.name} size="sm" />
                        <div>
                          <span className="font-bold text-neutral-900 text-xs block">{emp.name}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {emp.role.replace(/_/g, ' ')} • Currently has {emp.assignedLeadsCount || 0} leads
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500 font-semibold">Give:</span>
                        <input
                          type="number"
                          min="0"
                          max={unassignedSummary.total}
                          value={quotas[emp.id] ?? 0}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setQuotas((prev) => ({ ...prev, [emp.id]: val }));
                          }}
                          className="w-20 px-2.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-bold font-mono text-center focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-xs text-neutral-400">leads</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Mode 2: Equal Split */}
          {distributeMethod === 'round_robin' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-500">
                Select employees to participate in equal distribution:
              </p>

              <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                {employees
                  .filter((e) => e.isActive && e.role !== 'SUPER_ADMIN')
                  .map((emp) => {
                    const isChecked = selectedRepIds.includes(emp.id);
                    return (
                      <div
                        key={emp.id}
                        onClick={() => {
                          setSelectedRepIds((prev) =>
                            isChecked ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                          );
                        }}
                        className="p-3 flex items-center justify-between gap-4 bg-white hover:bg-neutral-50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                          />
                          <Avatar name={emp.name} size="sm" />
                          <div>
                            <span className="font-bold text-neutral-900 text-xs block">{emp.name}</span>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              {emp.role.replace(/_/g, ' ')} • Currently {emp.assignedLeadsCount || 0} leads
                            </span>
                          </div>
                        </div>

                        {selectedRepIds.length > 0 && isChecked && (
                          <span className="text-xs font-bold font-mono text-blue-600">
                            ~{Math.floor(unassignedSummary.total / selectedRepIds.length)} leads
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-neutral-200 flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsFullDistributeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={isExecutingDistribute || unassignedSummary.total === 0}
              onClick={handleExecuteFullDistribute}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {isExecutingDistribute ? 'Distributing...' : 'Execute Lead Distribution'}
            </Button>
          </div>
        </div>
      </SlideOverPanel>

      {/* MODAL 5: DELETE EMPLOYEE CONFIRMATION */}
      {userToDelete && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingUser) setUserToDelete(null);
          }}
        >
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-md w-full p-6 space-y-4 my-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Remove Employee Access</h3>
                <p className="text-xs text-neutral-500">Revoke login credentials and workspace clearance.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
              Are you sure you want to remove <strong className="text-neutral-900">{userToDelete.name}</strong> ({userToDelete.email})?
              Any leads currently assigned to this employee will remain in the database and can be reassigned.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleDeleteUser}
                disabled={isDeletingUser}
              >
                {isDeletingUser ? 'Removing...' : 'Confirm Remove'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
