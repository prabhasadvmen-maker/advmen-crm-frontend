import { KPICard } from '@/components/patterns/KPICard';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { Button } from '@/components/ui/Button';
import { useSessionStore } from '@/stores/sessionStore';
import { useDeals } from '../deals/hooks/useDeals';
import { useTasks } from '../tasks/hooks/useTasks';
import {
  Kanban,
  PhoneCall,
  DollarSign,
  Award,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SalesRepDashboard() {
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const { deals } = useDeals();
  const { tasks } = useTasks();

  const myDealsValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const pendingTasks = tasks.filter((t) => !t.isCompleted);

  return (
    <div className="space-y-fib-21">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-fib-13 pb-fib-8 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-fib-8 mb-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
              {user.name || 'Sales Rep'}'s Pipeline Dashboard
            </h1>
            <span className="text-[10px] font-bold px-fib-8 py-0.5 rounded-pill bg-green-100 text-green-800 border border-green-300 font-mono">
              Account Executive
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            My active pipeline, high-intent deal closing tasks, and Next-Best-Action AI recommendations.
          </p>
        </div>

        <div className="flex items-center gap-fib-8">
          <Button
            size="sm"
            variant="secondary"
            icon={<PhoneCall className="w-3.5 h-3.5" />}
            onClick={() => navigate('/calls')}
          >
            My Call Queue
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<Kanban className="w-3.5 h-3.5" />}
            onClick={() => navigate('/pipeline')}
          >
            Open Pipeline Kanban
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-fib-13">
        <WidgetBoundary name="kpi-rep-pipeline">
          <KPICard
            label="My Active Pipeline"
            value={`$${myDealsValue.toLocaleString()}`}
            subtext={`${deals.length} Active Deals`}
            accent="blue"
            icon={<DollarSign className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-rep-attainment">
          <KPICard
            label="Won Contracts"
            value={`$${deals.filter((d) => d.stage === 'WON').reduce((s, d) => s + (d.value || 0), 0).toLocaleString()}`}
            subtext="Closed revenue"
            accent="green"
            icon={<Award className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-rep-commission">
          <KPICard
            label="Deals in Negotiation"
            value={`${deals.filter((d) => d.stage === 'NEGOTIATION').length} Deals`}
            subtext="High closing probability"
            accent="green"
            icon={<DollarSign className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-rep-tasks-due">
          <KPICard
            label="Pending Action Tasks"
            value={`${pendingTasks.length} Tasks`}
            subtext="Scheduled follow-ups"
            accent="amber"
            icon={<CheckCircle className="w-4 h-4" />}
          />
        </WidgetBoundary>
      </div>

      {/* Action Schedule & Deals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-fib-21">
        {/* Left Column: Active Deals */}
        <div className="lg:col-span-7 space-y-fib-13">
          <div className="skeuo-raised-2 bg-white rounded-md border border-neutral-200 p-fib-21 space-y-fib-13">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Priority Deals in Motion
            </h3>

            {deals.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                No active deals in pipeline. Create or qualify new leads to initiate opportunities.
              </div>
            ) : (
              <div className="space-y-fib-8">
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-fib-13 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-neutral-900 block">{deal.title}</span>
                      <span className="text-[11px] text-neutral-500">{deal.company}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-neutral-900 block">${deal.value.toLocaleString()}</span>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-blue-100 text-blue-800">
                        {deal.stage}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scheduled Tasks */}
        <div className="lg:col-span-5 space-y-fib-13">
          <div className="skeuo-raised-2 bg-white rounded-md border border-neutral-200 p-fib-21 space-y-fib-13">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Upcoming Action Items
            </h3>

            {pendingTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                <Calendar className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <span>All scheduled follow-ups are up to date.</span>
              </div>
            ) : (
              <div className="space-y-fib-8 text-xs">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-fib-13 rounded-lg bg-neutral-50 border border-neutral-200 space-y-fib-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">{task.title}</span>
                      <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
