import { KPICard } from '@/components/patterns/KPICard';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { Button } from '@/components/ui/Button';
import { useDeals } from '../deals/hooks/useDeals';
import { useProposals } from '../proposals/hooks/useProposals';
import { useUIStore } from '@/stores/uiStore';
import {
  Kanban,
  AlertTriangle,
  Award,
  DollarSign,
  Target,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SalesManagerDashboard() {
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const { deals } = useDeals();
  const { proposals, updateStatus } = useProposals();

  const totalForecast = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const pendingApprovals = proposals.filter((p) => p.status === 'DRAFT' || p.status === 'SENT');

  return (
    <div className="space-y-fib-21">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-fib-13 pb-fib-8 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-fib-8 mb-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
              Sales Manager — Revenue & Pipeline Command
            </h1>
            <span className="text-[10px] font-bold px-fib-8 py-0.5 rounded-pill bg-amber-100 text-amber-800 border border-amber-300 font-mono">
              Team Leadership
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Pipeline health forecasting, quota attainment, high-value deal approvals, and SLA risk mitigation.
          </p>
        </div>

        <div className="flex items-center gap-fib-8">
          <Button
            size="sm"
            variant="secondary"
            icon={<Target className="w-3.5 h-3.5" />}
            onClick={() => navigate('/reports')}
          >
            Quota Leaderboards
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<Kanban className="w-3.5 h-3.5" />}
            onClick={() => navigate('/pipeline')}
          >
            Manage Pipeline
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-fib-13">
        <WidgetBoundary name="kpi-team-forecast">
          <KPICard
            label="Weighted Pipeline Forecast"
            value={`$${totalForecast.toLocaleString()}`}
            subtext={`${deals.length} Active Deals`}
            accent="green"
            icon={<DollarSign className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-manager-at-risk">
          <KPICard
            label="At-Risk Deals"
            value={`${deals.filter((d) => d.stage === 'LOST').length} Deals`}
            subtext="Requiring escalation"
            accent="rose"
            icon={<AlertTriangle className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-team-quota">
          <KPICard
            label="Won Revenue"
            value={`$${deals.filter((d) => d.stage === 'WON').reduce((s, d) => s + (d.value || 0), 0).toLocaleString()}`}
            subtext="Closed contracts"
            accent="blue"
            icon={<Award className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-approval-queue">
          <KPICard
            label="Pending Proposal Approvals"
            value={`${pendingApprovals.length} Proposals`}
            subtext="Ready for sign-off"
            accent="amber"
            icon={<CheckCircle className="w-4 h-4" />}
          />
        </WidgetBoundary>
      </div>

      {/* Approval Queue & Rep Oversight Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-fib-21">
        {/* Deal Approvals (8 cols) */}
        <div className="lg:col-span-8 space-y-fib-13">
          <div className="skeuo-raised-2 bg-white rounded-md border border-neutral-200 p-fib-21 space-y-fib-13">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              High-Value Proposals Awaiting Manager Sign-Off
            </h3>

            {pendingApprovals.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                No proposals pending approval. Newly generated quotes and proposals will appear here for manager sign-off.
              </div>
            ) : (
              <div className="space-y-fib-8">
                {pendingApprovals.map((prop) => (
                  <div
                    key={prop.id}
                    className="p-fib-13 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-fib-8">
                        <span className="font-bold text-neutral-900">
                          {prop.dealTitle || prop.company} (${prop.amount.toLocaleString()})
                        </span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.2 rounded font-bold font-mono">
                          {prop.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Client: {prop.company} • Recipient: {prop.recipientName}
                      </p>
                    </div>
                    <div className="flex items-center gap-fib-8">
                      <Button
                        size="xs"
                        variant="success"
                        onClick={async () => {
                          await updateStatus({ id: prop.id, status: 'ACCEPTED' });
                          addToast({
                            type: 'success',
                            title: 'Proposal Approved',
                            message: `Approved proposal for ${prop.company}.`,
                          });
                        }}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rep Leaderboard (4 cols) */}
        <div className="lg:col-span-4 space-y-fib-13">
          <div className="skeuo-raised-2 bg-white rounded-md border border-neutral-200 p-fib-21 space-y-fib-13">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Active Pipeline Distribution
            </h3>

            <div className="space-y-fib-8 text-xs">
              <div className="p-fib-13 bg-neutral-50 rounded border border-neutral-200 text-center space-y-1">
                <FileText className="w-6 h-6 text-neutral-400 mx-auto" />
                <span className="font-bold text-neutral-900 block">{deals.length} Active Deals</span>
                <span className="text-[10px] text-neutral-500">
                  Total Value: ${totalForecast.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
