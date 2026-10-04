import { useState, useEffect, useMemo } from 'react';
import { Task, EmployeeLeadStats } from '@/types';
import { KPICard } from '@/components/patterns/KPICard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { SlideOverPanel } from '@/components/patterns/SlideOverPanel';
import { useUIStore } from '@/stores/uiStore';
import { useSessionStore } from '@/stores/sessionStore';
import { FinalizedLead, leadApi } from '@/features/leads/api/leadApi';
import { cn } from '@/utils/cn';
import {
  CheckSquare,
  AlertTriangle,
  Clock,
  Plus,
  User,
  Building,
  Trash2,
  Search,
  RefreshCw,
  Trophy,
  Users,
  CheckCheck,
  IndianRupee,
  Phone,
  Mail,
  FileCheck2,
  X,
} from 'lucide-react';

import { useTasks } from './hooks/useTasks';
import { usersApi } from '@/features/admin/api/usersApi';
import { useLeads } from '@/features/leads/hooks/useLeads';

export function TasksPage() {
  const { user } = useSessionStore();
  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ORG_ADMIN';

  const { tasks, createTask, toggleTask, deleteTask } = useTasks();
  const [activeTab, setActiveTab] = useState<'finalized' | 'distribution' | 'tasks'>('finalized');

  // Finalized leads & Employee stats state
  const [finalizedLeads, setFinalizedLeads] = useState<FinalizedLead[]>([]);
  const [selectedFinalizedLead, setSelectedFinalizedLead] = useState<FinalizedLead | null>(null);
  const [employeeStats, setEmployeeStats] = useState<EmployeeLeadStats[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; role: string; email: string }[]>([]);
  const { leads = [] } = useLeads();
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Task creation state
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('HIGH');
  const [newTaskDueDate, setNewTaskDueDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().slice(0, 16);
  });
  const [newTaskRelatedLeadId, setNewTaskRelatedLeadId] = useState('');
  const [isSavingTask, setIsSavingTask] = useState(false);
  const { addToast } = useUIStore();

  const loadData = async () => {
    setIsLoadingData(true);
    setDataError('');
    try {
      const [finalized, stats, usersList] = await Promise.all([
        isAdmin ? leadApi.getFinalizedLeads() : leadApi.getMyFinalizedLeads(),
        isAdmin ? leadApi.getEmployeeLeadStats() : Promise.resolve([]),
        isAdmin ? usersApi.getUsers().catch(() => []) : Promise.resolve([]),
      ]);
      setFinalizedLeads(finalized || []);
      setEmployeeStats(stats || []);
      if (Array.isArray(usersList) && usersList.length > 0) {
        setEmployees(usersList.map((u) => ({ id: u.id, name: u.name, role: u.role, email: u.email })));
        if (!newTaskAssigneeId) {
          setNewTaskAssigneeId(usersList[0].id);
        }
      } else if (Array.isArray(stats) && stats.length > 0) {
        setEmployees(stats.map((s) => ({ id: s.employeeId, name: s.name, role: s.role, email: s.email })));
        if (!newTaskAssigneeId) {
          setNewTaskAssigneeId(stats[0].employeeId);
        }
      }
    } catch (err) {
      console.error('Failed to load finalized leads or employee stats:', err);
      setDataError(err instanceof Error ? err.message : 'Could not load task and completed-lead data.');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  const handleToggleTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextState = !task.isCompleted;
    toggleTask(taskId, nextState);
    addToast({
      type: nextState ? 'success' : 'info',
      title: nextState ? 'Task Marked Done' : 'Task Reopened',
      message: task.title,
    });
  };

  const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    await deleteTask(taskId);
    addToast({
      type: 'info',
      title: 'Task Deleted',
      message: 'The task has been removed.',
    });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsSavingTask(true);
    try {
      const selectedEmp = employees.find((e) => e.id === newTaskAssigneeId) || {
        id: user.id,
        name: user.name,
      };

      const selectedLead = leads.find((l) => l.id === newTaskRelatedLeadId);

      await createTask({
        title: newTaskTitle.trim(),
        notes: newTaskNotes.trim() || undefined,
        priority: newTaskPriority,
        ownerId: selectedEmp.id,
        assignedToName: selectedEmp.name,
        dueAt: new Date(newTaskDueDate).toISOString(),
        relatedEntityType: selectedLead ? 'LEAD' : 'GENERAL',
        relatedEntityId: selectedLead?.id || '',
        relatedEntityName: selectedLead?.name || '',
      });

      setIsNewTaskOpen(false);
      setNewTaskTitle('');
      setNewTaskNotes('');
      setNewTaskRelatedLeadId('');
      setActiveTab('tasks');
      addToast({
        type: 'success',
        title: 'Task Created & Assigned',
        message: `Task successfully assigned to ${selectedEmp.name}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Failed to Create Task',
        message: err.message || 'Something went wrong while creating task.',
      });
    } finally {
      setIsSavingTask(false);
    }
  };

  const priorityColors = {
    URGENT: 'bg-rose-100 text-rose-800 border-rose-200',
    HIGH: 'bg-amber-100 text-amber-800 border-amber-200',
    MEDIUM: 'bg-blue-100 text-blue-800 border-blue-200',
    LOW: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  };

  const urgentTasks = tasks.filter((t) => !t.isCompleted && (t.priority === 'URGENT' || t.slaBreachInMinutes));

  // Filter finalized leads by search
  const filteredFinalizedLeads = useMemo(() => {
    if (!searchQuery.trim()) return finalizedLeads;
    const q = searchQuery.toLowerCase();
    return finalizedLeads.filter(
      (l) =>
        l.name?.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q) ||
        l.assignedTo?.name?.toLowerCase().includes(q) ||
        l.clearedInfo?.clearedBy?.name?.toLowerCase().includes(q) ||
        l.clearedInfo?.purpose?.toLowerCase().includes(q)
    );
  }, [finalizedLeads, searchQuery]);

  // Filter employee stats by search
  const filteredEmployeeStats = useMemo(() => {
    if (!searchQuery.trim()) return employeeStats;
    const q = searchQuery.toLowerCase();
    return employeeStats.filter(
      (emp) =>
        emp.name?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.role?.toLowerCase().includes(q)
    );
  }, [employeeStats, searchQuery]);

  // Total deal value realized
  const totalRealizedValue = useMemo(() => {
    return finalizedLeads.reduce((sum, lead) => {
      const val = lead.clearedInfo?.dealValue || lead.estimatedValue || 0;
      return sum + Number(val);
    }, 0);
  }, [finalizedLeads]);

  return (
    <div className="space-y-fib-21">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-fib-13 pb-fib-8 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
              Tasks, Meetings & SLA Tracking
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              {isAdmin ? 'Admin & Lead Ops' : 'Staff Lead Ops'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Finalized leads, purpose notes, team lead distribution, and daily SLA tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={cn('w-3.5 h-3.5', isLoadingData && 'animate-spin')} />}
            onClick={loadData}
          >
            Refresh Data
          </Button>

          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsNewTaskOpen(true)}
            >
              Create Task
            </Button>
          )}
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-fib-13">
        <WidgetBoundary name="kpi-finalized-leads">
          <KPICard
            label="Finalized Leads"
            value={finalizedLeads.length}
            subtext={`${filteredFinalizedLeads.length} matching / converted`}
            accent="green"
            icon={<Trophy className="w-4 h-4 text-emerald-600" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-realized-value">
          <KPICard
            label="Total Deal Value Won"
            value={`₹${totalRealizedValue.toLocaleString('en-IN')}`}
            subtext="Revenue generated"
            accent="blue"
            icon={<IndianRupee className="w-4 h-4 text-blue-600" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-active-employees">
          <KPICard
            label="Employees with Leads"
            value={employeeStats.filter((e) => e.totalAssigned > 0).length}
            subtext={`${employeeStats.length} total team members`}
            accent="neutral"
            icon={<Users className="w-4 h-4 text-neutral-600" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-sla-breach-risk">
          <KPICard
            label="SLA Risk & Pending Tasks"
            value={urgentTasks.length}
            subtext={urgentTasks.length ? 'Attention required immediately' : 'All SLAs in healthy state'}
            accent={urgentTasks.length ? 'rose' : 'green'}
            icon={<AlertTriangle className="w-4 h-4" />}
          />
        </WidgetBoundary>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-neutral-200">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('finalized')}
            className={cn(
              'px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all',
              activeTab === 'finalized'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            )}
          >
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            <span>Finalized Leads & Purpose</span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                activeTab === 'finalized' ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-600'
              )}
            >
              {finalizedLeads.length}
            </span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('distribution')}
              className={cn(
                'px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all',
                activeTab === 'distribution'
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              )}
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span>Employee Lead Distribution</span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  activeTab === 'distribution' ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-600'
                )}
              >
                {employeeStats.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('tasks')}
            className={cn(
              'px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all',
              activeTab === 'tasks'
                ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            )}
          >
            <CheckSquare className="w-4 h-4 text-purple-600" />
            <span>Daily Tasks & SLA Alerts</span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                activeTab === 'tasks' ? 'bg-purple-600 text-white' : 'bg-neutral-100 text-neutral-600'
              )}
            >
              {tasks.length}
            </span>
          </button>
        </div>

        {/* Search for tabs 1 & 2 */}
        {(activeTab === 'finalized' || activeTab === 'distribution') && (
          <div className="relative w-64 pb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder={activeTab === 'finalized' ? 'Search lead, purpose, employee...' : 'Search employee...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-md border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* TAB 1: FINALIZED LEADS & PURPOSE */}
      {activeTab === 'finalized' && (
        <WidgetBoundary name="finalized-leads-view">
          <div className="space-y-fib-13">
            {isLoadingData && finalizedLeads.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-lg border border-neutral-200 text-sm text-neutral-500">
                Loading completed leads from the database…
              </div>
            ) : dataError ? (
              <div className="p-8 text-center bg-rose-50 rounded-lg border border-rose-200">
                <p className="text-sm font-bold text-rose-800">Completed leads could not be loaded.</p>
                <p className="mt-1 text-xs text-rose-700">{dataError}</p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => void loadData()}>
                  Retry
                </Button>
              </div>
            ) : filteredFinalizedLeads.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-lg border border-neutral-200">
                <Trophy className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-neutral-800">No Finalized Leads Found</h4>
                <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                  When an employee marks a lead as Complete and enters a finalization purpose, it will appear here immediately.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFinalizedLeads.map((lead) => {
                  const dealVal = lead.clearedInfo?.dealValue || lead.estimatedValue || 0;
                  const paymentReceived = lead.clearedInfo?.paymentTotalPaid || 0;
                  const paymentPending = Math.max(0, dealVal - paymentReceived);
                  const purposeText = lead.clearedInfo?.purpose || 'No purpose notes specified by employee.';
                  const employeeMessage =
                    lead.clearedInfo?.notes ||
                    lead.clearedInfo?.message ||
                    lead.message ||
                    purposeText;
                  const finalizedByName = lead.clearedInfo?.clearedBy?.name || lead.assignedTo?.name || 'Assigned Agent';
                  const finalizedTime = lead.clearedInfo?.clearedAt
                    ? new Date(lead.clearedInfo.clearedAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'Recently Finalized';

                  return (
                    <button
                      type="button"
                      key={lead.id}
                      onClick={() => setSelectedFinalizedLead(lead)}
                      className="w-full text-left bg-white rounded-lg border border-neutral-200 px-4 py-3 hover:border-blue-300 hover:bg-neutral-50/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                            <CheckCheck className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="truncate text-sm font-semibold text-neutral-900">{lead.name}</span>
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                                {lead.status}
                              </span>
                              {dealVal > 0 && (
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                                  <span className="font-medium text-neutral-600">
                                    Total: ₹{Number(dealVal).toLocaleString('en-IN')}
                                  </span>
                                  <span className="font-medium text-emerald-700">
                                    Received: ₹{Number(paymentReceived).toLocaleString('en-IN')}
                                  </span>
                                  <span className={cn('font-semibold', paymentPending > 0 ? 'text-amber-700' : 'text-emerald-700')}>
                                    Pending: ₹{Number(paymentPending).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                              {lead.company && (
                                <span className="flex min-w-0 items-center gap-1">
                                  <Building className="h-3 w-3 shrink-0 text-neutral-400" />
                                  <span className="truncate">{lead.company}{lead.city ? ` · ${lead.city}` : ''}</span>
                                </span>
                              )}
                              {lead.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 shrink-0 text-neutral-400" />
                                  {lead.phone}
                                </span>
                              )}
                              {lead.email && (
                                <span className="flex min-w-0 items-center gap-1">
                                  <Mail className="h-3 w-3 shrink-0 text-neutral-400" />
                                  <span className="truncate">{lead.email}</span>
                                </span>
                              )}
                            </div>
                            <p className="mt-1.5 truncate text-xs text-neutral-600" title={employeeMessage}>
                              <span className="font-medium text-neutral-700">Purpose:</span> {purposeText}
                              {employeeMessage !== purposeText && ` · ${employeeMessage}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-neutral-100 pt-2 text-xs sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                          <span className="truncate font-medium text-neutral-700">{finalizedByName}</span>
                          <span className="text-[11px] text-neutral-500">{finalizedTime}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </WidgetBoundary>
      )}

      {/* TAB 2: EMPLOYEE LEAD DISTRIBUTION */}
      {activeTab === 'distribution' && (
        <WidgetBoundary name="employee-distribution-view">
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Employee Lead Allocation & Conversion Metrics
                </h3>
                <p className="text-xs text-neutral-500">
                  Track employee lead counts, completed deals, active pipeline, and pending queries.
                </p>
              </div>
              <div className="text-xs font-semibold text-neutral-600">
                Total Employees: <span className="font-bold text-neutral-900">{filteredEmployeeStats.length}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-100/60 text-[11px] font-extrabold text-neutral-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4 text-center">Total Assigned Leads</th>
                    <th className="py-3 px-4 text-center">Finalized / Completed</th>
                    <th className="py-3 px-4 text-center">In Progress</th>
                    <th className="py-3 px-4 text-center">Open Queries</th>
                    <th className="py-3 px-4 text-right">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {filteredEmployeeStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        No employee data found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployeeStats.map((emp) => (
                      <tr key={emp.employeeId} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-neutral-900">{emp.name}</div>
                              <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                                <span>{emp.email}</span>
                                <span>•</span>
                                <span className="uppercase text-[10px] font-semibold text-blue-700 bg-blue-50 px-1 rounded">
                                  {emp.role}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={cn(
                              'inline-block px-2.5 py-1 rounded-full font-extrabold text-xs',
                              emp.totalAssigned > 0
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : 'bg-neutral-100 text-neutral-500'
                            )}
                          >
                            {emp.totalAssigned} Leads
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={cn(
                              'inline-block px-2.5 py-1 rounded-full font-extrabold text-xs',
                              emp.completedCount > 0
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-neutral-100 text-neutral-500'
                            )}
                          >
                            {emp.completedCount}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-neutral-700">{emp.inProgressCount}</span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {emp.openQueriesCount > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-full font-bold text-[11px] bg-amber-100 text-amber-900 border border-amber-300">
                              {emp.openQueriesCount} Open
                            </span>
                          ) : (
                            <span className="text-neutral-400">0</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, emp.conversionRate)}%` }}
                              />
                            </div>
                            <span className="font-extrabold text-neutral-800 w-10 text-right">
                              {emp.conversionRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </WidgetBoundary>
      )}

      {/* TAB 3: DAILY TASKS & SLA ALERTS */}
      {activeTab === 'tasks' && (
        <WidgetBoundary name="tasks-list">
          <div className="skeuo-raised-2 bg-white rounded-md border border-neutral-200 divide-y divide-neutral-100">
            <div className="p-fib-13 bg-neutral-50 flex items-center justify-between font-bold text-xs text-neutral-800">
              <span>Action Item</span>
              <span>Priority & SLA Status</span>
            </div>

            {tasks.length === 0 ? (
              <div className="p-12 text-center text-xs text-neutral-500">
                <CheckSquare className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <span>No active tasks or SLA alerts in workspace. Click 'Create Task' to schedule actions.</span>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={cn(
                    'group p-fib-13 flex items-start justify-between gap-fib-13 cursor-pointer hover:bg-neutral-50 transition-colors select-none',
                    task.isCompleted && 'opacity-60 bg-neutral-50/50'
                  )}
                >
                  <div className="flex items-start gap-fib-8">
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <h4
                        className={cn(
                          'text-xs font-bold text-neutral-900',
                          task.isCompleted && 'line-through text-neutral-500'
                        )}
                      >
                        {task.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-fib-8 text-[11px] text-neutral-500 mt-1">
                        {task.relatedTo?.name && (
                          <span className="flex items-center gap-1 font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                            <Building className="w-3 h-3 text-neutral-400" />
                            {task.relatedTo.name}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-neutral-400" />
                            {task.dueDate}
                          </span>
                        )}
                        {task.assignedToName && (
                          <span className="flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            <User className="w-3 h-3 text-blue-500" />
                            Assigned to: {task.assignedToName}
                          </span>
                        )}
                      </div>
                      {task.notes && (
                        <p className="text-[11px] text-neutral-600 mt-1.5 bg-amber-50/50 p-1.5 rounded border border-amber-200/50 max-w-xl">
                          <strong className="text-amber-900 font-semibold">Note:</strong> {task.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-fib-8 shrink-0">
                    {task.slaBreachInMinutes && !task.isCompleted && (
                      <span className="text-[10px] font-bold px-fib-5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        SLA risk: {task.slaBreachInMinutes}m left
                      </span>
                    )}
                    <span
                      className={cn(
                        'text-[10px] font-bold px-fib-5 py-0.5 rounded-pill border uppercase tracking-wider',
                        priorityColors[task.priority] || priorityColors.MEDIUM
                      )}
                    >
                      {task.priority}
                    </span>
                    <button
                      onClick={(e) => handleDeleteTask(e, task.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-rose-50 text-neutral-400 hover:text-rose-600"
                      title="Delete task"
                      aria-label="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </WidgetBoundary>
      )}

      <SlideOverPanel
        isOpen={selectedFinalizedLead !== null}
        onClose={() => setSelectedFinalizedLead(null)}
        title={selectedFinalizedLead?.name || 'Completed lead'}
        subtitle={selectedFinalizedLead?.company || selectedFinalizedLead?.leadId || 'Lead details'}
        badge={
          selectedFinalizedLead && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
              {selectedFinalizedLead.status}
            </span>
          )
        }
      >
        {selectedFinalizedLead && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['Lead ID', selectedFinalizedLead.leadId || selectedFinalizedLead.id],
                ['Contact', selectedFinalizedLead.name],
                ['Company', selectedFinalizedLead.company],
                ['Phone', selectedFinalizedLead.phone],
                ['Email', selectedFinalizedLead.email],
                ['City', selectedFinalizedLead.city],
                ['Address', selectedFinalizedLead.address],
                [
                  'Deal value',
                  selectedFinalizedLead.clearedInfo.dealValue !== undefined
                    ? `₹${Number(selectedFinalizedLead.clearedInfo.dealValue).toLocaleString('en-IN')}`
                    : undefined,
                ],
              ]
                .filter(([, value]) => Boolean(value))
                .map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
                    <span className="text-[10px] font-bold uppercase text-neutral-500">{label}</span>
                    <p className="mt-1 text-sm text-neutral-900 break-words">{value}</p>
                  </div>
                ))}
            </div>
            {(() => {
              const total = selectedFinalizedLead.clearedInfo?.dealValue ?? selectedFinalizedLead.budget ?? selectedFinalizedLead.estimatedValue ?? 0;
              const received = selectedFinalizedLead.clearedInfo?.paymentTotalPaid || 0;
              const pending = Math.max(0, total - received);
              return (
                <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-blue-900">Payment Summary</h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                    <div>
                      <span className="block text-neutral-500">Total Amount</span>
                      <strong className="mt-1 block font-mono text-neutral-900">₹{Number(total).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="block text-neutral-500">Received</span>
                      <strong className="mt-1 block font-mono text-emerald-700">₹{Number(received).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="block text-neutral-500">Pending</span>
                      <strong className={cn('mt-1 block font-mono', pending > 0 ? 'text-amber-700' : 'text-emerald-700')}>
                        ₹{Number(pending).toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                  <p className={cn('mt-3 text-[11px] font-semibold', pending > 0 ? 'text-amber-800' : 'text-emerald-800')}>
                    {pending > 0 ? 'Payment pending' : 'Full payment received'}
                  </p>
                </section>
              );
            })()}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-800">Completion details</h4>
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800">Purpose</span>
                <p className="mt-1 text-sm text-emerald-950 whitespace-pre-wrap">
                  {selectedFinalizedLead.clearedInfo.purpose || 'No purpose recorded.'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800">Employee message / notes</span>
                <p className="mt-1 text-sm text-emerald-950 whitespace-pre-wrap">
                  {selectedFinalizedLead.clearedInfo.notes ||
                    selectedFinalizedLead.clearedInfo.message ||
                    selectedFinalizedLead.message ||
                    'No additional message recorded.'}
                </p>
              </div>
              <p className="text-xs text-emerald-800">
                Completed by {selectedFinalizedLead.clearedInfo.clearedBy?.name || selectedFinalizedLead.assignedTo?.name || 'Employee'}
                {' · '}
                {selectedFinalizedLead.clearedInfo.clearedAt
                  ? new Date(selectedFinalizedLead.clearedInfo.clearedAt).toLocaleString('en-IN')
                  : 'Completion date unavailable'}
              </p>
            </div>
          </>
        )}
      </SlideOverPanel>

      {/* New Task Modal with Employee Assignment */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsNewTaskOpen(false)}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-neutral-200 p-6 z-10 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Create & Assign Task</h3>
                  <p className="text-xs text-neutral-500">
                    Schedule an operational task and assign it directly to a team member.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewTaskOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <Input
                label="Task Title *"
                placeholder="e.g. Call client regarding proposal terms"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Assign To Employee *
                  </label>
                  <select
                    value={newTaskAssigneeId}
                    onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-300 p-2.5 bg-white text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role.replace(/_/g, ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Priority *
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as Task['priority'])}
                    className="w-full text-xs rounded-xl border border-neutral-300 p-2.5 bg-white text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="URGENT">Urgent (SLA Triggered)</option>
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Due Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-300 p-2.5 bg-white text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Related Lead (Optional)
                  </label>
                  <select
                    value={newTaskRelatedLeadId}
                    onChange={(e) => setNewTaskRelatedLeadId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-300 p-2.5 bg-white text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">General Task (No Specific Lead)</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} - {l.company} ({l.phone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Task Instructions / Purpose
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter detailed instructions or purpose for the employee..."
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  className="w-full text-xs rounded-xl border border-neutral-300 p-2.5 bg-white text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsNewTaskOpen(false)}
                  disabled={isSavingTask}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSavingTask}
                >
                  Assign Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
