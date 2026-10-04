import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KPICard } from '@/components/patterns/KPICard';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useSessionStore } from '@/stores/sessionStore';
import { useLeads } from '@/features/leads/hooks/useLeads';
import { useDeals } from '@/features/deals/hooks/useDeals';
import { useCalls } from '@/features/calls/hooks/useCalls';
import { useTasks } from '@/features/tasks/hooks/useTasks';
import {
  Kanban,
  PhoneCall,
  CheckSquare,
  Phone,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Briefcase,
  HelpCircle,
} from 'lucide-react';

export function EmployeeDashboard() {
  const navigate = useNavigate();
  const { user, organizationName } = useSessionStore();
  const canViewDeals = user.permissions.includes('deal.view');

  const { leads = [] } = useLeads();
  const { deals = [] } = useDeals(canViewDeals);
  const { calls = [] } = useCalls();
  const { tasks = [], toggleTask } = useTasks();

  const [activeTab, setActiveTab] = useState<'deals' | 'tasks' | 'calls'>('deals');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  useEffect(() => {
    if (!canViewDeals && activeTab === 'deals') {
      setActiveTab('tasks');
    }
  }, [activeTab, canViewDeals]);

  // Filter items specifically assigned to this Employee (or unassigned fallback if none specifically tagged)
  const myLeads = useMemo(() => {
    return leads.filter((l) => {
      const isAssignedToMe =
        l.assignedTo?.id === user.id ||
        (l as any).ownerId === user.id ||
        (user.name && l.assignedTo?.name?.toLowerCase() === user.name?.toLowerCase());

      return !!isAssignedToMe;
    });
  }, [leads, user]);

  const myDeals = useMemo(() => {
    return deals.filter((d) => {
      return (
        d.assignedTo?.id === user.id ||
        d.assignedTo?.name?.toLowerCase() === user.name?.toLowerCase() ||
        deals.length <= 4
      );
    });
  }, [deals, user]);

  const myCalls = useMemo(() => {
    return calls.filter((c) => {
      return (
        c.callerId === user.id ||
        c.callerName?.toLowerCase() === user.name?.toLowerCase() ||
        calls.length <= 5
      );
    });
  }, [calls, user]);

  const myTasks = useMemo(() => {
    return tasks.filter((t) => {
      const isAssigned =
        (t.ownerId && t.ownerId === user.id) ||
        (t.assignedToName && user.name && t.assignedToName.toLowerCase() === user.name.toLowerCase());
      return !!isAssigned;
    });
  }, [tasks, user]);

  const filteredMyTasks = useMemo(() => {
    if (taskStatusFilter === 'PENDING') return myTasks.filter((t) => !t.isCompleted);
    if (taskStatusFilter === 'COMPLETED') return myTasks.filter((t) => t.isCompleted);
    return myTasks;
  }, [myTasks, taskStatusFilter]);

  // Derived Metrics
  const myTotalPipelineValue = myDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const myPendingTasks = myTasks.filter((t) => !t.isCompleted);

  return (
    <div className="space-y-fib-21">
      {/* Employee Workspace Header */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Avatar name={user.name} src={user.avatarUrl} size="lg" status="online" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
                Welcome, {user.name}
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                EMPLOYEE PORTAL
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                {organizationName || user.organizationName || 'ADVMEN CRM'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 flex flex-wrap items-center gap-2">
              <span>Department: <strong className="text-neutral-700">{user.department || 'Direct Sales & Outreach'}</strong></span>
              <span>•</span>
              <span>Account Provisioned by: <strong className="text-blue-600 font-mono">CRM Administrator</strong></span>
            </p>
          </div>
        </div>

        {/* Header Fast Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<HelpCircle className="w-3.5 h-3.5 text-amber-600" />}
            onClick={() => navigate('/calls')}
          >
            Open Lead Queries
          </Button>
          {canViewDeals && (
            <Button
              size="sm"
              variant="primary"
              icon={<Kanban className="w-3.5 h-3.5" />}
              onClick={() => navigate('/pipeline')}
            >
              My Deals Pipeline
            </Button>
          )}
        </div>
      </div>

      {/* Admin Provisioning Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Employee Workspace Mode:</strong> Your leads, sales deals, and daily targets are assigned by the <strong>Admin</strong>. You do not have access to administrative settings.
          </span>
        </div>
        <span className="text-[11px] font-mono text-blue-600 font-semibold shrink-0 hidden sm:inline">
          Role: {user.role.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Personal KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-fib-13">
        {canViewDeals && <WidgetBoundary name="kpi-emp-closed-won">
          <KPICard
            label="Closed Won Deals"
            value={String(myDeals.filter((d) => d.stage === 'WON').length)}
            delta={`₹${myDeals.filter((d) => d.stage === 'WON').reduce((sum, d) => sum + (d.value || 0), 0).toLocaleString('en-IN')}`}
            deltaDirection="up"
            subtext="Revenue finalized"
            accent="green"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          />
        </WidgetBoundary>}

        {canViewDeals && <WidgetBoundary name="kpi-emp-pipeline">
          <KPICard
            label="My Active Pipeline"
            value={`₹${myTotalPipelineValue.toLocaleString('en-IN')}`}
            delta={`${myDeals.length} active deals`}
            deltaDirection="up"
            subtext="Potential deal value"
            accent="green"
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </WidgetBoundary>}

        <WidgetBoundary name="kpi-emp-tasks">
          <KPICard
            label="Pending Tasks Today"
            value={String(myPendingTasks.length)}
            subtext={`${myTasks.length - myPendingTasks.length} completed`}
            accent="amber"
            icon={<CheckSquare className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-emp-queries">
          <KPICard
            label="My Queries to Admin"
            value={String(myLeads.filter((l) => l.queries?.some((q) => q.status === 'OPEN')).length)}
            subtext="Pending admin response"
            accent="amber"
            icon={<HelpCircle className="w-4 h-4 text-amber-600" />}
          />
        </WidgetBoundary>
      </div>

      {/* Dynamic Tabs Navigation */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-6">
          {canViewDeals && (
            <button
              onClick={() => setActiveTab('deals')}
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'deals'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Kanban className="w-4 h-4" />
              <span>My Deals & Pipeline ({myDeals.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'tasks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>My Daily Tasks ({myPendingTasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('calls')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'calls'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>My Outreach Calls ({myCalls.length})</span>
          </button>
        </nav>
      </div>

      {/* TAB 2: MY DEALS PIPELINE */}
      {canViewDeals && activeTab === 'deals' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                My Deals & Revenue Stages
              </h3>
              <p className="text-xs text-neutral-500">
                Opportunities you are actively working to negotiate and close.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              icon={<Kanban className="w-3.5 h-3.5" />}
              onClick={() => navigate('/pipeline')}
            >
              Open Full Kanban
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {myDeals.length === 0 ? (
              <div className="col-span-full py-12 text-center text-neutral-400">
                <Briefcase className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                <p className="text-sm font-semibold text-neutral-700">No active deals assigned yet.</p>
                <p className="text-xs text-neutral-400">Qualify an assigned lead to create a new pipeline deal.</p>
              </div>
            ) : (
              myDeals.map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => navigate('/pipeline')}
                  className="p-4 rounded-xl border border-neutral-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer space-y-3 bg-neutral-50/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-neutral-900 line-clamp-1">{deal.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono">
                      {deal.stage}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-lg font-black text-neutral-900 font-mono">
                      ${deal.value.toLocaleString()}
                    </span>
                    <span className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {deal.probability}% win probability
                    </span>
                  </div>

                  <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Contact: {deal.contactName || 'Corporate Client'}</span>
                    <span className="text-blue-600 font-semibold flex items-center gap-1">
                      Details <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MY DAILY TASKS */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Daily Work Checklist & Follow-Ups
              </h3>
              <p className="text-xs text-neutral-500">
                Tasks, customer meetings, and follow-up deadlines assigned to you by Admin.
              </p>
            </div>
            
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setTaskStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  taskStatusFilter === 'ALL'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                All ({myTasks.length})
              </button>
              <button
                onClick={() => setTaskStatusFilter('PENDING')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  taskStatusFilter === 'PENDING'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Pending ({myPendingTasks.length})
              </button>
              <button
                onClick={() => setTaskStatusFilter('COMPLETED')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  taskStatusFilter === 'COMPLETED'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Completed ({myTasks.length - myPendingTasks.length})
              </button>
            </div>
          </div>

          <div className="divide-y divide-neutral-100">
            {filteredMyTasks.length === 0 ? (
              <div className="py-12 text-center text-neutral-400">
                <CheckCircle2 className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-neutral-700">No tasks in this view</p>
                <p className="text-xs text-neutral-400">
                  {taskStatusFilter === 'PENDING'
                    ? 'You have completed all your pending tasks!'
                    : 'Tasks assigned to you by the Admin will appear here.'}
                </p>
              </div>
            ) : (
              filteredMyTasks.map((task) => (
                <div
                  key={task.id}
                  className={`py-3.5 px-3 rounded-xl transition-colors hover:bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    task.isCompleted ? 'bg-neutral-50/60 opacity-70' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={() => toggleTask(task.id, !task.isCompleted)}
                      className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`text-xs font-bold ${
                            task.isCompleted ? 'line-through text-neutral-400' : 'text-neutral-900'
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.isCompleted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Done
                          </span>
                        )}
                      </div>

                      {task.notes && (
                        <div className="p-2 bg-amber-50 rounded-lg border border-amber-200/60 text-xs text-amber-900 font-medium">
                          <strong>Admin Instruction:</strong> {task.notes}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
                        {task.relatedTo?.name && (
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            <Briefcase className="w-3 h-3 text-blue-500" />
                            Lead: {task.relatedTo.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          Due: {task.dueDate || 'Today'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono uppercase ${
                        task.priority === 'URGENT'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : task.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : task.priority === 'MEDIUM'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MY CALLS & OUTREACH */}
      {activeTab === 'calls' && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Assigned Telecaller Queue & Call Logs
              </h3>
              <p className="text-xs text-neutral-500">
                Outbound call list with disposition logging and customer notes.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              icon={<PhoneCall className="w-3.5 h-3.5" />}
              onClick={() => navigate('/calls')}
            >
              Launch Autodialer
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-neutral-50 text-[11px] font-semibold text-neutral-500 uppercase border-y border-neutral-200">
                <tr>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Scheduled Time</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {myCalls.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-neutral-500">
                      <PhoneCall className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                      <p className="font-semibold text-neutral-700">No calls in queue.</p>
                      <p className="text-[11px] text-neutral-400">All scheduled outbound calls have been dispositioned.</p>
                    </td>
                  </tr>
                ) : (
                  myCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-neutral-900">
                        {call.leadName || 'Target Prospect'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-600">
                        {call.leadPhone}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          call.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                        {call.scheduledAt || 'Immediate'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Phone className="w-3 h-3 text-emerald-600" />}
                          onClick={() => {
                            navigate('/calls');
                          }}
                        >
                          Dial Now
                        </Button>
                      </td>
                    </tr>
                  ))
                )}

              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
