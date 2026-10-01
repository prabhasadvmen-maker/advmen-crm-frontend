import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Lead } from '@/types';
import { DataTable, ColumnDef } from '@/components/patterns/DataTable';
import { KPICard } from '@/components/patterns/KPICard';
import { StatusPill } from '@/components/patterns/StatusPill';
import { LeadScoreBadge } from './components/LeadScoreBadge';
import { LeadAISummaryCard } from './components/LeadAISummaryCard';
import { Timeline } from '@/components/patterns/Timeline';
import { SlideOverPanel } from '@/components/patterns/SlideOverPanel';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { PermissionGate } from '@/components/system/PermissionGate';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { useUIStore } from '@/stores/uiStore';
import { useSessionStore } from '@/stores/sessionStore';
import { usersApi, UserDto } from '@/features/admin/api/usersApi';
import { leadApi } from './api/leadApi';
import { cn } from '@/utils/cn';
import {
  UserPlus,
  Download,
  Users,
  HelpCircle,
  Clock,
  Building2,
  Trash2,
  Upload,
  Share2,
  CheckCircle2,
  RefreshCw,
  X,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  AlertTriangle,
  Copy,
  Eye,
  User,
} from 'lucide-react';

import { useLeads } from './hooks/useLeads';
import { useActivities } from './hooks/useActivities';

export function LeadsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { user } = useSessionStore();
  const userRoleUpper = ((user?.role || '') as string).toUpperCase().replace('-', '_');
  const isAdmin =
    userRoleUpper === 'SUPER_ADMIN' ||
    userRoleUpper === 'SUPERADMIN' ||
    userRoleUpper === 'ORG_ADMIN' ||
    userRoleUpper === 'ADMIN' ||
    (user?.permissions || []).includes('lead.assign');

  // Server-side Query Parameters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [ownerFilter, setOwnerFilter] = useState<string>('ALL');

  // Query Modal State (Sent to Admin Telecaller Queue)
  const [queryModalLead, setQueryModalLead] = useState<Lead | null>(null);
  const [queryText, setQueryText] = useState('');
  const [queryPriority, setQueryPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);

  // Complete Modal State (Sent to Admin Tasks & SLA Tracking)
  const [completeModalLead, setCompleteModalLead] = useState<Lead | null>(null);
  const [completePurpose, setCompletePurpose] = useState('');
  const [completeDealValue, setCompleteDealValue] = useState<number>(0);
  const [completeStatus, setCompleteStatus] = useState<'WON' | 'CONVERTED'>('WON');
  const [completeNotes, setCompleteNotes] = useState('');
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false);

  const handleOpenQueryModal = (lead: Lead) => {
    setQueryModalLead(lead);
    setQueryText('');
    setQueryPriority('NORMAL');
  };

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryModalLead || !queryText.trim()) return;
    setIsSubmittingQuery(true);
    try {
      await leadApi.raiseQuery(queryModalLead.id, {
        text: queryText.trim(),
        priority: queryPriority,
      });
      addToast({
        type: 'success',
        title: 'Query Sent to Telecaller Queue',
        message: `Query for ${queryModalLead.name} has been routed to Admin Telecaller Queue & Voice Intelligence.`,
      });
      setQueryModalLead(null);
      setQueryText('');
      refetch();
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Failed to Send Query',
        message: err.message || 'Something went wrong while submitting query.',
      });
    } finally {
      setIsSubmittingQuery(false);
    }
  };

  const handleOpenCompleteModal = (lead: Lead) => {
    setCompleteModalLead(lead);
    setCompletePurpose('');
    setCompleteDealValue(lead.estimatedValue || lead.budget || 0);
    setCompleteStatus('WON');
    setCompleteNotes('');
  };

  const handleSubmitComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalLead || !completePurpose.trim()) {
      addToast({
        type: 'warning',
        title: 'Purpose Required',
        message: 'Please enter the purpose / reason why this lead was finalized.',
      });
      return;
    }
    setIsSubmittingComplete(true);
    try {
      await leadApi.completeLead(completeModalLead.id, {
        purpose: completePurpose.trim(),
        dealValue: Number(completeDealValue) || 0,
        status: completeStatus,
        notes: completeNotes.trim() || undefined,
      });
      addToast({
        type: 'success',
        title: 'Lead Finalized',
        message: `${completeModalLead.name} marked as finalized. Won deal added to Deals & Pipeline Kanban and details sent to Tasks.`,
      });
      setCompleteModalLead(null);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      refetch();
      loadWorkspaceData();
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Failed to Finalize Lead',
        message: err.message || 'Something went wrong while finalizing lead.',
      });
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  // Leads Query with Server Pagination
  const { leads, pagination, isLoading, refetch, createLead, updateLead, deleteLead } = useLeads({
    page,
    limit,
    search: search.trim() || undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    ownerId: ownerFilter !== 'ALL' ? ownerFilter : undefined,
  });

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { activities } = useActivities(selectedLead?.id);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Employees List for filters and distribution
  const [employees, setEmployees] = useState<UserDto[]>([]);
  const [unassignedSummary, setUnassignedSummary] = useState<{ total: number; unassignedIds: string[] }>({
    total: 0,
    unassignedIds: [],
  });

  // Distribute Modal State
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [distributeTarget, setDistributeTarget] = useState<'selected' | 'all_unassigned'>('selected');
  const [distributeMethod, setDistributeMethod] = useState<'round_robin' | 'custom' | 'single'>('single');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [singleEmpId, setSingleEmpId] = useState<string>('');
  const [singleQuantity, setSingleQuantity] = useState<number>(10);
  const [customQuotas, setCustomQuotas] = useState<Record<string, number>>({});
  const [isDistributing, setIsDistributing] = useState(false);

  // Delete Completed Leads Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetType, setDeleteTargetType] = useState<
    'ALL_COMPLETED' | 'BY_STATUS' | 'BY_EMPLOYEE' | 'UNASSIGNED' | 'ALL_LEADS'
  >('ALL_COMPLETED');
  const [deleteTargetStatus, setDeleteTargetStatus] = useState<string>('WON');
  const [deleteTargetEmployeeId, setDeleteTargetEmployeeId] = useState<string>('ALL');
  const [deletePreviewCount, setDeletePreviewCount] = useState<number | null>(null);
  const [isLoadingDeletePreview, setIsLoadingDeletePreview] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Fetch count of leads matching delete criteria
  const fetchDeleteCount = useCallback(async () => {
    if (!isDeleteModalOpen) return;
    setIsLoadingDeletePreview(true);
    try {
      let params: any = {};
      if (deleteTargetType === 'ALL_LEADS') {
        params = { all: true };
      } else if (deleteTargetType === 'ALL_COMPLETED') {
        params = {
          status: 'ALL_COMPLETED',
          employeeId: deleteTargetEmployeeId !== 'ALL' ? deleteTargetEmployeeId : undefined,
        };
      } else if (deleteTargetType === 'BY_STATUS') {
        params = {
          status: deleteTargetStatus,
          employeeId: deleteTargetEmployeeId !== 'ALL' ? deleteTargetEmployeeId : undefined,
        };
      } else if (deleteTargetType === 'BY_EMPLOYEE') {
        params = {
          employeeId: deleteTargetEmployeeId,
          status: deleteTargetStatus !== 'ALL' ? deleteTargetStatus : undefined,
        };
      } else if (deleteTargetType === 'UNASSIGNED') {
        params = { unassignedOnly: true };
      }
      const res = await leadApi.getBulkDeleteCount(params);
      setDeletePreviewCount(res.count);
    } catch {
      setDeletePreviewCount(null);
    } finally {
      setIsLoadingDeletePreview(false);
    }
  }, [isDeleteModalOpen, deleteTargetType, deleteTargetStatus, deleteTargetEmployeeId]);

  useEffect(() => {
    if (isDeleteModalOpen) {
      fetchDeleteCount();
    }
  }, [isDeleteModalOpen, fetchDeleteCount]);

  // Form State for Manual Lead Creation
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadCompany, setNewLeadCompany] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadValue, setNewLeadValue] = useState('50000');
  const [newLeadStatus, setNewLeadStatus] = useState<Lead['status']>('NEW');

  // Load Employees and Unassigned Leads Count
  const loadWorkspaceData = useCallback(() => {
    usersApi
      .getUsers()
      .then((users) => {
        const active = users.filter((u) => u.isActive && u.role !== 'SUPER_ADMIN');
        setEmployees(active);
        if (active.length > 0) {
          setSelectedEmpIds(active.map((e) => e.id));
          setSingleEmpId(active[0].id);
        }
      })
      .catch(() => {});

    leadApi
      .getUnassignedSummary()
      .then((summary) => setUnassignedSummary(summary))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Handle Search Input Debounce / Change
  const handleSearchChange = (term: string) => {
    setSearch(term);
    setPage(1);
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadCompany) return;

    await createLead({
      name: newLeadName,
      company: newLeadCompany,
      email: newLeadEmail || `${newLeadName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      phone: newLeadPhone || '+91 9876543210',
      budget: Number(newLeadValue) || 50000,
      status: newLeadStatus,
    });

    setIsCreateModalOpen(false);
    setNewLeadName('');
    setNewLeadCompany('');
    setNewLeadEmail('');
    setNewLeadPhone('');
    setNewLeadStatus('NEW');
    refetch();
    loadWorkspaceData();
  };

  const handleDeleteLead = async (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${lead.name}?`)) return;
    try {
      await deleteLead(lead.id);
      if (selectedLead?.id === lead.id) setSelectedLead(null);
      addToast({
        type: 'info',
        title: 'Lead Deleted',
        message: `${lead.name} (${lead.company}) has been removed.`,
      });
      refetch();
      loadWorkspaceData();
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Delete Failed',
        message: err?.message || 'Could not delete lead.',
      });
    }
  };

  // Open Distribute Modal
  const openDistributeModal = (target: 'selected' | 'all_unassigned') => {
    setDistributeTarget(target);
    // Initialize equal custom quotas as a helpful starting point
    const targetTotal = target === 'selected' ? selectedIds.length : unassignedSummary.total;
    const initialQuotas: Record<string, number> = {};
    if (employees.length > 0 && targetTotal > 0) {
      const perEmp = Math.floor(targetTotal / employees.length);
      employees.forEach((emp) => {
        initialQuotas[emp.id] = perEmp;
      });
    }
    setCustomQuotas(initialQuotas);
    setSingleQuantity(Math.min(10, targetTotal || 10));
    setIsDistributeModalOpen(true);
  };

  // Calculations for Custom Quotas
  const totalTargetLeads =
    distributeTarget === 'selected' ? selectedIds.length : unassignedSummary.total;

  const totalAllocated = useMemo(() => {
    return Object.values(customQuotas).reduce((sum, val) => sum + (Number(val) || 0), 0);
  }, [customQuotas]);

  const remainingToAllocate = totalTargetLeads - totalAllocated;

  // Execute Distribution to Employees
  const handleExecuteDistribution = async () => {
    const targetLeadIds =
      distributeTarget === 'selected'
        ? selectedIds
        : unassignedSummary.unassignedIds;

    if (!targetLeadIds.length) {
      addToast({
        type: 'warning',
        title: 'No Leads Selected',
        message: 'There are no leads available to distribute.',
      });
      return;
    }

    setIsDistributing(true);
    try {
      if (distributeMethod === 'round_robin') {
        if (!selectedEmpIds.length) {
          addToast({
            type: 'warning',
            title: 'Select Employees',
            message: 'Please select at least 1 employee for round-robin distribution.',
          });
          setIsDistributing(false);
          return;
        }

        const res = await leadApi.distributeEvenly(targetLeadIds, selectedEmpIds);
        const summary = res.distribution
          .map((d: any) => `${d.employee.name}: ${d.count}`)
          .join(', ');

        addToast({
          type: 'success',
          title: 'Leads Distributed Successfully!',
          message: `${res.assignedCount.toLocaleString()} leads divided among employees (${summary}).`,
        });
      } else if (distributeMethod === 'custom') {
        // Build slices based on custom quotas
        let offset = 0;
        const distribution: Array<{ employeeId: string; leadIds: string[] }> = [];

        for (const emp of employees) {
          const quota = Number(customQuotas[emp.id]) || 0;
          if (quota > 0) {
            const chunk = targetLeadIds.slice(offset, offset + quota);
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
            message: 'Please enter at least 1 lead count for an employee.',
          });
          setIsDistributing(false);
          return;
        }

        const res = await leadApi.distributeCustom(distribution);
        const summary = res.distribution
          .map((d: any) => `${d.employee.name}: ${d.count}`)
          .join(', ');

        addToast({
          type: 'success',
          title: 'Custom Leads Distributed Successfully!',
          message: `${res.assignedCount.toLocaleString()} leads assigned as per custom quota (${summary}).`,
        });
      } else {
        if (!singleEmpId) {
          addToast({
            type: 'warning',
            title: 'Select Employee',
            message: 'Please choose an employee to assign leads to.',
          });
          setIsDistributing(false);
          return;
        }

        const countToAssign = Math.min(singleQuantity || 1, targetLeadIds.length);
        const sliceToAssign = targetLeadIds.slice(0, countToAssign);
        const emp = employees.find((e) => e.id === singleEmpId);
        const res = await leadApi.assignBulk(sliceToAssign, singleEmpId);

        addToast({
          type: 'success',
          title: 'Leads Assigned Successfully',
          message: `${res.assignedCount.toLocaleString()} leads assigned to ${emp?.name || 'employee'}.`,
        });
      }

      setIsDistributeModalOpen(false);
      setSelectedIds([]);
      refetch();
      loadWorkspaceData();
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Distribution Failed',
        message: err.message || 'Could not complete lead distribution.',
      });
    } finally {
      setIsDistributing(false);
    }
  };

  // Delete Selected Leads from Table
  const handleDeleteSelectedLeads = async () => {
    if (!selectedIds.length) return;
    if (
      !window.confirm(
        `Are you sure you want to delete these ${selectedIds.length.toLocaleString()} selected leads?`
      )
    ) {
      return;
    }

    try {
      const res = await leadApi.bulkDelete({ leadIds: selectedIds });
      addToast({
        type: 'info',
        title: 'Leads Deleted',
        message: `${res.deletedCount.toLocaleString()} leads removed from database and employee screens.`,
      });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      await refetch();
      loadWorkspaceData();
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Delete Failed',
        message: err.message || 'Could not delete selected leads.',
      });
    }
  };

  // Delete Completed / Filtered Leads
  const handleDeleteCompletedLeads = async () => {
    setIsDeletingBulk(true);
    try {
      let params: any = {};
      let label = '';
      if (deleteTargetType === 'ALL_LEADS') {
        params = { all: true };
        label = 'All leads in CRM';
      } else if (deleteTargetType === 'ALL_COMPLETED') {
        params = {
          status: 'ALL_COMPLETED',
          employeeId: deleteTargetEmployeeId !== 'ALL' ? deleteTargetEmployeeId : undefined,
        };
        label = 'Completed leads (Won, Lost, Converted, Unqualified)';
      } else if (deleteTargetType === 'BY_STATUS') {
        params = {
          status: deleteTargetStatus,
          employeeId: deleteTargetEmployeeId !== 'ALL' ? deleteTargetEmployeeId : undefined,
        };
        label = `Leads with status "${deleteTargetStatus}"`;
      } else if (deleteTargetType === 'BY_EMPLOYEE') {
        const emp = employees.find((e) => e.id === deleteTargetEmployeeId);
        params = {
          employeeId: deleteTargetEmployeeId,
          status: deleteTargetStatus !== 'ALL' ? deleteTargetStatus : undefined,
        };
        label = `Leads assigned to ${emp?.name || 'employee'}`;
      } else if (deleteTargetType === 'UNASSIGNED') {
        params = { unassignedOnly: true };
        label = 'Unassigned leads';
      }

      const res = await leadApi.bulkDelete(params);
      addToast({
        type: 'success',
        title: 'Leads Deleted Successfully',
        message: `${res.deletedCount.toLocaleString()} leads permanently removed from CRM & employee screens (${label}).`,
      });
      setIsDeleteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      await refetch();
      loadWorkspaceData();
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Delete Failed',
        message: err.message || 'Could not delete leads.',
      });
    } finally {
      setIsDeletingBulk(false);
    }
  };


  const columns: ColumnDef<Lead>[] = [
    {
      id: 'name',
      header: 'Contact & Title',
      sortable: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-fib-8">
          <Avatar name={row.name} size="sm" />
          <div className="min-w-0">
            <span className="font-bold text-neutral-900 block truncate group-hover:text-blue-600">
              {row.name}
            </span>
            <span className="text-[11px] text-neutral-500 block truncate">
              {row.title || 'Decision Maker'}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'company',
      header: 'Company & Address',
      sortable: true,
      cell: ({ row }) => {
        const address =
          row.address ||
          row.city ||
          (row.customFields?.['Address'] as string) ||
          (row.customFields?.['address'] as string) ||
          (row.customFields?.['City'] as string) ||
          (row.customFields?.['city'] as string) ||
          (row.customFields?.['Location'] as string) ||
          (row.customFields?.['location'] as string) ||
          (row.customFields?.['Area'] as string) ||
          (row.customFields?.['State'] as string) ||
          '';

        return (
          <div className="space-y-0.5 min-w-0 max-w-[220px]">
            <div className="flex items-center gap-1.5 text-neutral-900 font-semibold truncate">
              <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="truncate">{row.company || 'Individual Client'}</span>
            </div>
            {address ? (
              <div className="flex items-center gap-1 text-[11px] text-neutral-600 truncate" title={address}>
                <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="truncate font-medium">{address}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                <MapPin className="w-3 h-3 text-neutral-300 shrink-0" />
                <span className="italic">No address</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'contact',
      header: 'Phone / Email',
      cell: ({ row }) => (
        <div className="space-y-1">
          {row.phone && (
            <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded w-fit border border-emerald-200">
              <Phone className="w-3 h-3 text-emerald-600" />
              <span>{row.phone}</span>
            </div>
          )}
          {row.email && (
            <div className="flex items-center gap-1 font-mono text-[11px] text-neutral-500 truncate max-w-[170px]">
              <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
              <span className="truncate">{row.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'score',
      header: 'AI Score',
      sortable: true,
      cell: ({ row }) => (
        <LeadScoreBadge score={row.score} category={row.scoreCategory} />
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      cell: ({ row }) => {
        const variantMap: Record<Lead['status'], any> = {
          NEW: 'info',
          ASSIGNED: 'primary',
          CONTACTED: 'neutral',
          CONNECTED: 'info',
          QUALIFIED: 'success',
          UNQUALIFIED: 'danger',
          NURTURING: 'warning',
          MEETING: 'primary',
          PROPOSAL: 'warning',
          NEGOTIATION: 'warning',
          WON: 'success',
          LOST: 'danger',
          CONVERTED: 'success',
        };
        return <StatusPill label={row.status} variant={variantMap[row.status] || 'neutral'} />;
      },
    },
    {
      id: 'estimatedValue',
      header: 'Budget / Value',
      sortable: true,
      align: 'right',
      cell: ({ row }) => (
        <span className="font-bold text-neutral-900 tabular-nums font-mono">
          {row.estimatedValue ? `₹${row.estimatedValue.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      id: 'assignedTo',
      header: 'Assigned Employee (Owner)',
      cell: ({ row }) => {
        const hasOwner = row.assignedTo?.name;
        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {hasOwner ? (
              <div className="flex items-center gap-1.5 text-neutral-800 font-medium">
                <Avatar name={row.assignedTo?.name || 'Employee'} size="xs" />
                <span className="truncate">{row.assignedTo?.name}</span>
                {isAdmin && (
                  <select
                    value=""
                    onChange={async (e) => {
                      const empId = e.target.value;
                      if (!empId) return;
                      await leadApi.assignBulk([row.id], empId);
                      const emp = (employees || []).find((x) => x.id === empId);
                      addToast({
                        type: 'success',
                        title: 'Lead Reassigned',
                        message: `Reassigned to ${emp?.name || 'employee'}.`,
                      });
                      refetch();
                      loadWorkspaceData();
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-neutral-400 hover:text-neutral-700 bg-transparent border-0 cursor-pointer p-0 w-4 h-4 ml-1"
                    title="Reassign to another employee (Admin Only)"
                  >
                    <option value="" disabled>Reassign...</option>
                    {(employees || []).map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  Unassigned
                </span>
                {isAdmin && (
                  <select
                    value=""
                    onChange={async (e) => {
                      const empId = e.target.value;
                      if (!empId) return;
                      await leadApi.assignBulk([row.id], empId);
                      const emp = (employees || []).find((x) => x.id === empId);
                      addToast({
                        type: 'success',
                        title: 'Lead Assigned',
                        message: `${row.name} assigned to ${emp?.name || 'employee'}.`,
                      });
                      refetch();
                      loadWorkspaceData();
                    }}
                    className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-1.5 py-0.5 cursor-pointer focus:outline-none"
                  >
                    <option value="" disabled>+ Assign</option>
                    {(employees || []).map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const hasOpenQuery = row.queries?.some((q) => q.status === 'OPEN');
        const isWon = row.status === 'WON' || row.status === 'CONVERTED' || !!row.clearedInfo?.clearedAt;

        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {isAdmin ? (
              // In Admin Panel: Show data and status badges only (No Query/Complete buttons)
              <div className="flex items-center gap-2">
                {isWon ? (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                    title={`Finalized: ${row.clearedInfo?.purpose || 'Won'}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Finalized</span>
                  </span>
                ) : hasOpenQuery ? (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                    title="Lead has pending employee query in Telecaller Queue"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Query Open</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-neutral-400 font-mono italic">
                    Active
                  </span>
                )}

                <button
                  onClick={(e) => handleDeleteLead(e, row)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-rose-50 text-neutral-400 hover:text-rose-600 ml-1"
                  title="Delete lead"
                  aria-label="Delete lead"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              // Employee portal action buttons
              <>
                <button
                  type="button"
                  onClick={() => setSelectedLead(row)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
                  title="Click to view full lead details, customer address, and phone"
                >
                  <Eye className="w-3 h-3 text-blue-600" />
                  <span>View Details</span>
                </button>

                <button
                  onClick={() => handleOpenQueryModal(row)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold border transition-colors shadow-2xs',
                    hasOpenQuery
                      ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                      : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                  )}
                  title={hasOpenQuery ? 'Lead has pending query in Admin Telecaller Queue' : 'Raise query to Admin Telecaller Queue'}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{hasOpenQuery ? 'Query Pending' : 'Query'}</span>
                </button>

                {isWon ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                    title={`Finalized: ${row.clearedInfo?.purpose || 'Won'}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Finalized</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleOpenCompleteModal(row)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-700 shadow-2xs transition-colors"
                    title="Mark lead finalized and enter completion purpose for Admin"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete</span>
                  </button>
                )}
              </>
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
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            Leads & Prospects
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage all database leads, track progress status, and assign leads to employees with custom quotas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Jump to Import Page */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload className="w-3.5 h-3.5 text-blue-600" />}
            onClick={() => navigate('/lead-import')}
            className="border-neutral-300 hover:bg-blue-50 hover:text-blue-700"
          >
            Import Excel Sheet
          </Button>

          {/* Distribute Unassigned Leads Button (Admin Only) */}
          {isAdmin && unassignedSummary.total > 0 && (
            <Button
              variant="primary"
              size="sm"
              icon={<Share2 className="w-3.5 h-3.5" />}
              onClick={() => openDistributeModal('all_unassigned')}
              className="bg-indigo-600 hover:bg-indigo-700 border-indigo-700 shadow-sm"
            >
              Distribute {unassignedSummary.total.toLocaleString()} Unassigned Leads
            </Button>
          )}

          {/* Delete Completed Leads Button (Admin Only) */}
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
              onClick={() => setIsDeleteModalOpen(true)}
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              Delete Completed Leads
            </Button>
          )}

          <PermissionGate permission="lead.export">
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() =>
                addToast({
                  type: 'info',
                  title: 'Exporting Leads',
                  message: `Generating export for ${pagination.total.toLocaleString()} leads.`,
                })
              }
            >
              Export
            </Button>
          </PermissionGate>

          <PermissionGate permission="lead.create">
            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-3.5 h-3.5" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Add Single Lead
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* KPI Tiles Row with Accurate Live Total Count */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-fib-13">
        <WidgetBoundary name="kpi-total-leads">
          <KPICard
            label="Total Leads in Database"
            value={pagination.total.toLocaleString()}
            subtext="All tracked prospects"
            accent="blue"
            icon={<Users className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-unassigned-leads">
          <KPICard
            label="Unassigned Leads"
            value={unassignedSummary.total.toLocaleString()}
            subtext="Ready for employee distribution"
            accent="amber"
            icon={<UserCheck className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-hot-prospects">
          <KPICard
            label="Active Employees"
            value={employees.length}
            subtext="Available sales & callers"
            accent="green"
            icon={<Users className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-page-info">
          <KPICard
            label="Current Page Range"
            value={`Page ${pagination.page} / ${pagination.totalPages}`}
            subtext={`Showing ${limit} rows per page`}
            accent="neutral"
            icon={<Clock className="w-4 h-4" />}
          />
        </WidgetBoundary>
      </div>

      {/* Filter Toolbar Component */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 bg-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="PROPOSAL">Proposal</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
          </select>
        </div>

        {/* Owner / Employee Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 font-medium">Employee:</span>
          <select
            value={ownerFilter}
            onChange={(e) => {
              setOwnerFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 bg-white font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Leads</option>
            <option value="UNASSIGNED">⚠️ Unassigned Only</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                👤 {emp.name} ({emp.department || 'Sales'})
              </option>
            ))}
          </select>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={() => {
            refetch();
            loadWorkspaceData();
          }}
          disabled={isLoading}
          className="p-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 text-xs flex items-center gap-1 font-medium ml-auto"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Data Table with Server-Side Pagination */}
      <WidgetBoundary name="leads-data-table">
        <DataTable
          columns={columns}
          data={leads}
          keyExtractor={(lead) => lead.id}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(lead) => setSelectedLead(lead)}
          searchPlaceholder="Search 9,800+ leads by name, phone, company, or city..."
          onSearchChange={handleSearchChange}
          isLoading={isLoading}
          pageSize={limit}
          serverPagination={{
            currentPage: pagination.page,
            totalPages: pagination.totalPages,
            totalCount: pagination.total,
            onPageChange: (newPage) => setPage(newPage),
            onPageSizeChange: (newLimit) => {
              setLimit(newLimit);
              setPage(1);
            },
          }}
          bulkActions={
            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => openDistributeModal('selected')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-sm transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Distribute {selectedIds.length} Selected Leads
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={handleDeleteSelectedLeads}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-sm transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete ({selectedIds.length}) Leads
                </button>
              )}
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-neutral-500 hover:text-neutral-700 underline"
              >
                Clear Selection
              </button>
            </div>
          }
        />
      </WidgetBoundary>

      {/* SlideOver Lead Detail View Drawer */}
      <SlideOverPanel
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        title={selectedLead?.name}
        subtitle={`${selectedLead?.title || 'Decision Maker'} at ${selectedLead?.company}`}
        width="xl"
      >
        {selectedLead && (
          <div className="space-y-5">
            {/* Status & Quick Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-500 uppercase">Status:</span>
                <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                  {selectedLead.status}
                </span>
                <LeadScoreBadge score={selectedLead.score} category={selectedLead.scoreCategory} />
              </div>

              {/* Action Buttons for Employees/Admins inside the drawer */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenQueryModal(selectedLead);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors shadow-2xs"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Raise Query</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenCompleteModal(selectedLead);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete / Final</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={(e) => handleDeleteLead(e, selectedLead)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                    title="Delete Lead"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* FULL CONTACT & ADDRESS CARD (Crucial User Requirement!) */}
            <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                <span>Contact & Address Details</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Phone with 1-click copy */}
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Phone Number</span>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-extrabold font-mono text-neutral-900">
                      {selectedLead.phone || '—'}
                    </span>
                    {selectedLead.phone && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedLead.phone);
                          addToast({
                            type: 'info',
                            title: 'Phone Number Copied',
                            message: `${selectedLead.phone} copied to clipboard for mobile calling.`,
                          });
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 transition-colors"
                        title="Copy number to dial from your phone"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Email Address</span>
                  <p className="text-xs font-mono font-medium text-neutral-800 truncate">
                    {selectedLead.email || 'No email provided'}
                  </p>
                </div>

                {/* Full Address Card (Spans across both columns) */}
                <div className="col-span-1 sm:col-span-2 p-3.5 bg-gradient-to-r from-amber-50/60 to-orange-50/40 rounded-lg border border-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px] uppercase tracking-wider">
                    <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Customer Full Address:</span>
                  </div>
                  <p className="text-xs font-bold text-neutral-900 leading-relaxed pl-5">
                    {selectedLead.address ||
                      selectedLead.city ||
                      (selectedLead.customFields?.['Address'] as string) ||
                      (selectedLead.customFields?.['address'] as string) ||
                      (selectedLead.customFields?.['City'] as string) ||
                      (selectedLead.customFields?.['city'] as string) ||
                      (selectedLead.customFields?.['Location'] as string) ||
                      (selectedLead.customFields?.['location'] as string) ||
                      'No street address recorded for this lead.'}
                  </p>
                </div>

                {/* Company & Title */}
                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Company</span>
                  <p className="font-semibold text-neutral-900 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{selectedLead.company || 'Individual Client'}</span>
                  </p>
                </div>

                {/* Estimated Budget / Deal Value */}
                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Budget / Value</span>
                  <p className="font-extrabold font-mono text-emerald-700 text-sm mt-0.5">
                    ₹{(selectedLead.budget || selectedLead.estimatedValue || 0).toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Assigned Employee */}
                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Assigned Employee</span>
                  <p className="font-semibold text-neutral-800 flex items-center gap-1.5 mt-0.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>{selectedLead.assignedTo?.name || 'Unassigned'}</span>
                  </p>
                </div>

                {/* Lead Created / Assigned Date */}
                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Date</span>
                  <p className="font-mono text-neutral-600 text-xs mt-0.5">
                    {selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleDateString('en-IN') : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* If Lead has Active Query -> Show query details */}
            {selectedLead.queries && selectedLead.queries.length > 0 && (
              <div className="bg-amber-50 rounded-xl border-2 border-amber-300 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-950 font-extrabold text-xs">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>Submitted Employee Queries ({selectedLead.queries.length})</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                    In Queries Hub
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedLead.queries.map((q, idx) => (
                    <div key={q.id || idx} className="p-3 bg-white rounded-lg border border-amber-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-neutral-500">
                        <span className="font-bold text-neutral-800">{q.raisedBy?.name || 'Employee'} ({q.priority}):</span>
                        <span className="font-mono">{q.createdAt ? new Date(q.createdAt).toLocaleString('en-IN') : ''}</span>
                      </div>
                      <p className="font-semibold text-neutral-900 bg-amber-50/50 p-2 rounded">
                        {q.text}
                      </p>
                      {q.reply && (
                        <div className="p-2 rounded bg-emerald-50 text-emerald-950 font-medium text-[11px] mt-1 border border-emerald-200">
                          <strong>Admin Reply:</strong> {q.reply}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* If Finalized -> Show WON Banner & Notes */}
            {(selectedLead.status === 'WON' || selectedLead.clearedInfo?.clearedAt) && (
              <div className="bg-emerald-50 rounded-xl border-2 border-emerald-300 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-950 font-extrabold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Lead Finalized</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-emerald-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-neutral-600">
                    <span>Deal Value: <strong>₹{(selectedLead.clearedInfo?.dealValue || 0).toLocaleString('en-IN')}</strong></span>
                    <span>By: <strong>{selectedLead.clearedInfo?.clearedByName || selectedLead.clearedInfo?.clearedBy?.name || 'Employee'}</strong></span>
                  </div>
                  <p className="font-semibold text-neutral-900 pt-1">
                    <strong>Message:</strong> {selectedLead.clearedInfo?.notes || selectedLead.clearedInfo?.message || selectedLead.clearedInfo?.purpose || 'Lead marked won.'}
                  </p>
                </div>
              </div>
            )}

            {/* AI Assistant Section */}
            <LeadAISummaryCard
              lead={selectedLead}
              onUpdateLead={async (updated) => {
                await updateLead({
                  id: updated.id,
                  payload: { aiSummary: updated.aiSummary, score: updated.score },
                });
                setSelectedLead(updated);
                refetch();
              }}
            />

            {/* Activity Timeline */}
            <WidgetBoundary name={`lead-timeline-${selectedLead.id}`}>
              <div className="skeuo-raised-2 bg-white rounded-md border border-neutral-200 p-fib-21 space-y-fib-13">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Activity Feed & Engagement History
                </h3>
                <Timeline events={activities} />
              </div>
            </WidgetBoundary>
          </div>
        )}
      </SlideOverPanel>

      {/* Distribute Leads to Employees Modal (With Custom Quotas & Equal Split) */}
      {isDistributeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-neutral-200 p-6 z-10 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-indigo-600" />
                  Distribute Leads to Employees
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {distributeTarget === 'selected'
                    ? `Divide selected ${selectedIds.length} leads among employees`
                    : `Divide all ${unassignedSummary.total.toLocaleString()} unassigned leads among employees`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDistributeModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Distribution Target Info Banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs font-medium text-indigo-900">Total Leads to Distribute:</span>
              <span className="text-sm font-extrabold text-indigo-700 font-mono">
                {totalTargetLeads.toLocaleString()} Leads
              </span>
            </div>

            {/* Distribution Mode Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDistributeMethod('round_robin')}
                className={`py-2 rounded-lg transition-all ${
                  distributeMethod === 'round_robin'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                ⚡ Equal Split
              </button>
              <button
                type="button"
                onClick={() => setDistributeMethod('custom')}
                className={`py-2 rounded-lg transition-all ${
                  distributeMethod === 'custom'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                🎯 Custom Count
              </button>
              <button
                type="button"
                onClick={() => setDistributeMethod('single')}
                className={`py-2 rounded-lg transition-all ${
                  distributeMethod === 'single'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                👤 Single Employee
              </button>
            </div>

            {/* Mode 1: Equal Split */}
            {distributeMethod === 'round_robin' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-700">
                    Select Employees ({selectedEmpIds.length}/{employees.length} Selected):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEmpIds.length === employees.length) {
                        setSelectedEmpIds([]);
                      } else {
                        setSelectedEmpIds(employees.map((e) => e.id));
                      }
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {selectedEmpIds.length === employees.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-neutral-100 border border-neutral-200 rounded-xl p-2 bg-neutral-50/50">
                  {employees.map((emp) => {
                    const isChecked = selectedEmpIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className="flex items-center justify-between p-2 hover:bg-neutral-100/70 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmpIds([...selectedEmpIds, emp.id]);
                              } else {
                                setSelectedEmpIds(selectedEmpIds.filter((id) => id !== emp.id));
                              }
                            }}
                            className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <Avatar name={emp.name} size="xs" />
                          <div>
                            <span className="text-xs font-semibold text-neutral-900 block">{emp.name}</span>
                            <span className="text-[10px] text-neutral-500">{emp.department || 'Sales'} • {emp.email}</span>
                          </div>
                        </div>
                        {isChecked && selectedEmpIds.length > 0 && (
                          <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            ~{Math.round(totalTargetLeads / selectedEmpIds.length).toLocaleString()} leads
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode 2: Custom Count (Apne hisab se lead data dena) */}
            {distributeMethod === 'custom' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 p-2.5 rounded-xl text-xs">
                  <div>
                    <span className="text-neutral-500 font-medium">Allocated: </span>
                    <span className="font-bold text-neutral-900">{totalAllocated.toLocaleString()}</span>
                    <span className="text-neutral-400"> / {totalTargetLeads.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 font-medium">Remaining: </span>
                    <span
                      className={`font-bold font-mono ${
                        remainingToAllocate < 0
                          ? 'text-rose-600'
                          : remainingToAllocate === 0
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {remainingToAllocate.toLocaleString()} leads
                    </span>
                  </div>
                </div>

                <div className="max-h-52 overflow-y-auto divide-y divide-neutral-100 border border-neutral-200 rounded-xl p-2 bg-neutral-50/30 space-y-1">
                  {employees.map((emp) => {
                    const quota = customQuotas[emp.id] ?? 0;
                    return (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar name={emp.name} size="xs" />
                          <div>
                            <span className="text-xs font-semibold text-neutral-900 block">{emp.name}</span>
                            <span className="text-[10px] text-neutral-500">{emp.department || 'Sales'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={totalTargetLeads}
                            value={quota === 0 ? '' : quota}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setCustomQuotas((prev) => ({ ...prev, [emp.id]: val }));
                            }}
                            placeholder="0"
                            className="w-24 text-right px-2.5 py-1 rounded-lg border border-neutral-200 text-xs font-mono font-bold focus:outline-none focus:border-indigo-500"
                          />
                          <span className="text-xs text-neutral-500">leads</span>
                          {remainingToAllocate > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomQuotas((prev) => ({
                                  ...prev,
                                  [emp.id]: (prev[emp.id] || 0) + remainingToAllocate,
                                }));
                              }}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100"
                              title="Assign remaining leads to this employee"
                            >
                              +All
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode 3: Single Employee with exact quantity */}
            {distributeMethod === 'single' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-800 block mb-1">
                    Choose Employee *
                  </label>
                  <select
                    value={singleEmpId}
                    onChange={(e) => setSingleEmpId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 bg-white font-medium focus:outline-none focus:border-indigo-500"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department || 'Sales'} • {emp.phone || emp.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-neutral-800">
                      How Many Leads to Assign? *
                    </label>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      Available: {totalTargetLeads}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={totalTargetLeads}
                    value={singleQuantity}
                    onChange={(e) => setSingleQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm font-bold font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[5, 10, 20, 50].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSingleQuantity(num)}
                        className={`px-2.5 py-1 rounded text-xs font-bold font-mono border ${
                          singleQuantity === num
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-neutral-50 text-neutral-700 border-neutral-200'
                        }`}
                      >
                        {num} Leads
                      </button>
                    ))}
                    {totalTargetLeads > 0 && (
                      <button
                        type="button"
                        onClick={() => setSingleQuantity(totalTargetLeads)}
                        className="px-2.5 py-1 rounded text-xs font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200"
                      >
                        All Available ({totalTargetLeads})
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600">
                  Will assign <strong className="text-indigo-700">{Math.min(singleQuantity, totalTargetLeads)} leads</strong> to{' '}
                  <strong className="text-neutral-900">{employees.find((e) => e.id === singleEmpId)?.name || 'Selected Employee'}</strong>.
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDistributeModalOpen(false)}
                disabled={isDistributing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleExecuteDistribution}
                isLoading={isDistributing}
                disabled={distributeMethod === 'custom' && (totalAllocated === 0 || remainingToAllocate < 0)}
                className="bg-indigo-600 hover:bg-indigo-700 border-indigo-700 shadow-md font-semibold"
              >
                {isDistributing
                  ? 'Distributing...'
                  : distributeMethod === 'single'
                  ? `Assign ${Math.min(singleQuantity, totalTargetLeads)} Leads to Employee`
                  : 'Distribute Leads Now'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Leads Data Modal (Completed, Employee, Status, Unassigned, All) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-neutral-200 p-6 z-10 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900">
                    Delete Leads Data
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Data will be removed from database and employee views.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Criteria Selection Tabs */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">
                Select Delete Mode:
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDeleteTargetType('ALL_COMPLETED')}
                  className={`py-2 px-1 rounded-lg text-center transition-all ${
                    deleteTargetType === 'ALL_COMPLETED'
                      ? 'bg-white text-rose-600 shadow-sm font-bold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  🎯 All Completed
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTargetType('BY_EMPLOYEE')}
                  className={`py-2 px-1 rounded-lg text-center transition-all ${
                    deleteTargetType === 'BY_EMPLOYEE'
                      ? 'bg-white text-rose-600 shadow-sm font-bold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  👤 By Employee
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTargetType('BY_STATUS')}
                  className={`py-2 px-1 rounded-lg text-center transition-all ${
                    deleteTargetType === 'BY_STATUS'
                      ? 'bg-white text-rose-600 shadow-sm font-bold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  📋 By Status
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => setDeleteTargetType('UNASSIGNED')}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-all font-medium ${
                    deleteTargetType === 'UNASSIGNED'
                      ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  ⚠️ Unassigned Only
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTargetType('ALL_LEADS')}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-all font-medium ${
                    deleteTargetType === 'ALL_LEADS'
                      ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  💥 All CRM Leads (Reset)
                </button>
              </div>
            </div>

            {/* Contextual Filter Options */}
            <div className="space-y-3 bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl">
              {/* If BY_EMPLOYEE */}
              {deleteTargetType === 'BY_EMPLOYEE' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-700 block">
                    Select Employee:
                  </label>
                  <select
                    value={deleteTargetEmployeeId}
                    onChange={(e) => setDeleteTargetEmployeeId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 bg-white font-medium focus:outline-none focus:border-rose-500"
                  >
                    <option value="ALL">All Employees</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        👤 {emp.name} ({emp.department || 'Sales'} • {emp.email})
                      </option>
                    ))}
                  </select>

                  <div className="pt-1">
                    <label className="text-xs font-medium text-neutral-600 block">
                      Status Filter (Optional):
                    </label>
                    <select
                      value={deleteTargetStatus}
                      onChange={(e) => setDeleteTargetStatus(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-neutral-300 bg-white font-medium focus:outline-none focus:border-rose-500 mt-1"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="ALL_COMPLETED">Completed Only (Won + Lost + Converted)</option>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="WON">Won</option>
                      <option value="LOST">Lost</option>
                      <option value="CONTACTED">Contacted</option>
                    </select>
                  </div>
                </div>
              )}

              {/* If BY_STATUS */}
              {deleteTargetType === 'BY_STATUS' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-700 block">
                    Select Status:
                  </label>
                  <select
                    value={deleteTargetStatus}
                    onChange={(e) => setDeleteTargetStatus(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 bg-white font-medium focus:outline-none focus:border-rose-500"
                  >
                    <option value="NEW">🆕 New Leads</option>
                    <option value="ASSIGNED">⚡ Assigned Leads</option>
                    <option value="CONTACTED">📞 Contacted Leads</option>
                    <option value="QUALIFIED">✅ Qualified Leads</option>
                    <option value="WON">🏆 Won Leads</option>
                    <option value="LOST">❌ Lost Leads</option>
                    <option value="CONVERTED">🔄 Converted Leads</option>
                    <option value="UNQUALIFIED">🚫 Unqualified Leads</option>
                  </select>

                  <div className="pt-1">
                    <label className="text-xs font-medium text-neutral-600 block">
                      Filter by Specific Employee (Optional):
                    </label>
                    <select
                      value={deleteTargetEmployeeId}
                      onChange={(e) => setDeleteTargetEmployeeId(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-neutral-300 bg-white font-medium focus:outline-none focus:border-rose-500 mt-1"
                    >
                      <option value="ALL">All Employees</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          👤 {emp.name} ({emp.department || 'Sales'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* If ALL_COMPLETED */}
              {deleteTargetType === 'ALL_COMPLETED' && (
                <div className="space-y-2">
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    All completed leads (<strong>Won, Lost, Converted, and Unqualified</strong>) will be deleted together.
                  </p>
                  <div>
                    <label className="text-xs font-medium text-neutral-600 block">
                      Filter by Specific Employee (Optional):
                    </label>
                    <select
                      value={deleteTargetEmployeeId}
                      onChange={(e) => setDeleteTargetEmployeeId(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-neutral-300 bg-white font-medium focus:outline-none focus:border-rose-500 mt-1"
                    >
                      <option value="ALL">All Employees</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          👤 {emp.name} ({emp.department || 'Sales'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* If UNASSIGNED */}
              {deleteTargetType === 'UNASSIGNED' && (
                <p className="text-xs text-neutral-600 leading-relaxed">
                  All leads that are not currently assigned to any employee (Unassigned / New) will be permanently deleted from the database.
                </p>
              )}

              {/* If ALL_LEADS */}
              {deleteTargetType === 'ALL_LEADS' && (
                <div className="p-2.5 bg-rose-100/70 border border-rose-300 rounded-lg text-xs text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">
                    Warning: This action will permanently delete all leads in the CRM database and remove them from all employee portals.
                  </span>
                </div>
              )}
            </div>

            {/* Live Count Preview Banner */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-950 block">Target Leads for Deletion:</span>
                <span className="text-[11px] text-indigo-700">
                  {isLoadingDeletePreview
                    ? 'Counting matching records in database...'
                    : deletePreviewCount === 0
                    ? 'No matching leads found (0 leads)'
                    : `${(deletePreviewCount ?? 0).toLocaleString()} leads will be permanently deleted`}
                </span>
              </div>
              <span className="text-lg font-mono font-black text-rose-600">
                {isLoadingDeletePreview ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  `${(deletePreviewCount ?? 0).toLocaleString()} Leads`
                )}
              </span>
            </div>

            {deletePreviewCount === 0 && !isLoadingDeletePreview && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  No leads found matching the selected employee or status filter. Please adjust your criteria.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeletingBulk}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteCompletedLeads}
                isLoading={isDeletingBulk}
                disabled={isDeletingBulk || isLoadingDeletePreview || deletePreviewCount === 0}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md disabled:opacity-50"
              >
                Delete {(deletePreviewCount ?? 0).toLocaleString()} Leads Permanently
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Lead Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-fib-13">
          <div
            onClick={() => setIsCreateModalOpen(false)}
            className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative w-full max-w-lg skeuo-raised-3 bg-white rounded-xl border border-neutral-200 p-fib-21 z-10 shadow-2xl space-y-fib-21">
            <div className="border-b border-neutral-100 pb-fib-8">
              <h3 className="text-base font-bold text-neutral-900">Add New Inbound Lead</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Record new prospect details. AI intent scoring will run automatically upon creation.
              </p>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-fib-13">
              <Input
                label="Full Name *"
                placeholder="e.g. Rachel Adams"
                value={newLeadName}
                onChange={(e) => setNewLeadName(e.target.value)}
                required
              />

              <Input
                label="Company Name *"
                placeholder="e.g. Apex Global Systems"
                value={newLeadCompany}
                onChange={(e) => setNewLeadCompany(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-fib-13">
                <Input
                  label="Work Email"
                  type="email"
                  placeholder="rachel@apex.com"
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                />
                <Input
                  label="Phone Number"
                  placeholder="+91 9876543210"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-fib-13">
                <Input
                  label="Estimated Deal Value (₹)"
                  type="number"
                  value={newLeadValue}
                  onChange={(e) => setNewLeadValue(e.target.value)}
                />
                <Select
                  label="Initial Status"
                  value={newLeadStatus}
                  onChange={(val) => setNewLeadStatus(val as Lead['status'])}
                  options={[
                    { value: 'NEW', label: 'New' },
                    { value: 'ASSIGNED', label: 'Assigned' },
                    { value: 'QUALIFIED', label: 'Qualified' },
                    { value: 'CONTACTED', label: 'Contacted' },
                    { value: 'NURTURING', label: 'Nurturing' },
                  ]}
                />
              </div>

              <div className="pt-fib-13 border-t border-neutral-100 flex items-center justify-end gap-fib-8">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Create Lead
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raise Query to Admin Telecaller Queue Modal */}
      {queryModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setQueryModalLead(null)}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-neutral-200 p-6 z-10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Raise Query to Admin / Telecaller
                  </h3>
                  <p className="text-xs text-neutral-500">
                    This query will be routed to Admin Telecaller Queue & Voice Intelligence.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQueryModalLead(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lead Brief Card */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-neutral-900 block text-sm">{queryModalLead.name}</span>
                <span className="text-neutral-500">{queryModalLead.company} • {queryModalLead.phone}</span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {queryModalLead.status}
              </span>
            </div>

            <form onSubmit={handleSubmitQuery} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Query Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['NORMAL', 'HIGH', 'URGENT'] as const).map((pri) => (
                    <button
                      key={pri}
                      type="button"
                      onClick={() => setQueryPriority(pri)}
                      className={cn(
                        'py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors',
                        queryPriority === pri
                          ? pri === 'URGENT'
                            ? 'bg-rose-100 text-rose-800 border-rose-400 ring-2 ring-rose-200'
                            : pri === 'HIGH'
                            ? 'bg-amber-100 text-amber-800 border-amber-400 ring-2 ring-amber-200'
                            : 'bg-blue-100 text-blue-800 border-blue-400 ring-2 ring-blue-200'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                      )}
                    >
                      {pri}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Query Details / Question *
                </label>
                <textarea
                  rows={4}
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="e.g. Customer wants custom pricing approval, phone number verify, callback requested, or needs special terms..."
                  className="w-full p-3 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-neutral-800"
                  required
                />
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setQueryModalLead(null)}
                  disabled={isSubmittingQuery}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmittingQuery}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Send Query to Admin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete / Finalize Lead Modal */}
      {completeModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setCompleteModalLead(null)}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-neutral-200 p-6 z-10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Finalize / Complete Lead
                  </h3>
                  <p className="text-xs text-neutral-500">
                    This finalized lead will be recorded in Deals & Tasks with your message.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompleteModalLead(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lead Brief Card */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-neutral-900 block text-sm">{completeModalLead.name}</span>
                <span className="text-neutral-500">{completeModalLead.company} • {completeModalLead.phone}</span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Closing
              </span>
            </div>

            <form onSubmit={handleSubmitComplete} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Purpose / Finalization Reason *
                </label>
                <textarea
                  rows={3}
                  value={completePurpose}
                  onChange={(e) => setCompletePurpose(e.target.value)}
                  placeholder="e.g. Enterprise Annual Subscription closed / Client agreed to advance payment / Demo passed and order confirmed..."
                  className="w-full p-3 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-neutral-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Final Outcome Status
                  </label>
                  <select
                    value={completeStatus}
                    onChange={(e) => setCompleteStatus(e.target.value as 'WON' | 'CONVERTED')}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-800 bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="WON">Deal Won</option>
                    <option value="CONVERTED">Converted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Final Deal Value (₹)
                  </label>
                  <input
                    type="number"
                    value={completeDealValue}
                    onChange={(e) => setCompleteDealValue(Number(e.target.value))}
                    placeholder="e.g. 50000"
                    className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs font-mono font-bold text-neutral-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Additional Notes
                </label>
                <input
                  type="text"
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  placeholder="e.g. Follow-up for onboarding next week"
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCompleteModalLead(null)}
                  disabled={isSubmittingComplete}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmittingComplete}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
                >
                  Confirm Finalization
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
