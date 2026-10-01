import { KPICard } from '@/components/patterns/KPICard';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, DollarSign, Award, Target } from 'lucide-react';
import { useDeals } from '../deals/hooks/useDeals';
import { useInvoices } from '../invoices/hooks/useInvoices';

export function ReportsPage() {
  const { deals } = useDeals();
  const { invoices } = useInvoices();

  const totalWonRevenue = deals
    .filter((d) => d.stage === 'WON')
    .reduce((sum, d) => sum + (d.value || 0), 0);

  const totalCollectedInvoices = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const totalPipeline = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const winRate = deals.length
    ? Math.round((deals.filter((d) => d.stage === 'WON').length / deals.length) * 100)
    : 0;

  const chartData = [
    { month: 'Pipeline Total', revenue: totalPipeline, target: totalPipeline || 100000 },
    { month: 'Won Revenue', revenue: totalWonRevenue, target: totalPipeline || 100000 },
    { month: 'Invoiced & Paid', revenue: totalCollectedInvoices, target: totalWonRevenue || 100000 },
  ];

  return (
    <div className="space-y-fib-21">
      {/* Header */}
      <div className="pb-fib-8 border-b border-neutral-200">
        <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
          Executive Reports & Pipeline Analytics
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Real-time ARR tracking, quota attainment, and rep performance intelligence.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-fib-13">
        <WidgetBoundary name="kpi-q3-revenue">
          <KPICard
            label="Won Booked Revenue"
            value={`$${totalWonRevenue.toLocaleString()}`}
            subtext="Closed contracts"
            accent="green"
            icon={<DollarSign className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-quota-attainment">
          <KPICard
            label="Win Rate"
            value={`${winRate}%`}
            subtext={`${deals.filter((d) => d.stage === 'WON').length} of ${deals.length} won`}
            accent="green"
            icon={<Target className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-win-cycle">
          <KPICard
            label="Active Deals"
            value={deals.length}
            subtext={`$${totalPipeline.toLocaleString()} total pipeline`}
            accent="blue"
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-top-performer">
          <KPICard
            label="Cash Invoiced & Settled"
            value={`$${totalCollectedInvoices.toLocaleString()}`}
            subtext="Real-time collection"
            accent="violet"
            icon={<Award className="w-4 h-4" />}
          />
        </WidgetBoundary>
      </div>

      {/* Charts Grid: Fibonacci 8:4 proportion */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-fib-21">
        {/* Revenue Velocity Chart (8 cols) */}
        <div className="lg:col-span-8 skeuo-raised-2 bg-white rounded-md border border-neutral-200 p-fib-21 space-y-fib-13">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Pipeline Conversion vs. Invoiced Settlements
              </h3>
              <p className="text-xs text-neutral-500">
                Green bars indicate booked revenue and payments.
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EA" />
                <XAxis dataKey="month" stroke="#6B7684" fontSize={11} />
                <YAxis
                  stroke="#6B7684"
                  fontSize={11}
                  tickFormatter={(val) => `$${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Amount']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#CBD2D9',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(17,22,29,0.1)',
                  }}
                />
                <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} name="Actual Value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Distribution Panel (4 cols) */}
        <div className="lg:col-span-4 skeuo-raised-2 bg-white rounded-md border border-neutral-200 p-fib-21 space-y-fib-13">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Deal Stages Breakdown
            </h3>
            <Award className="w-4 h-4 text-amber-500" />
          </div>

          {deals.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              No deals recorded in pipeline. Analytics will update in real-time as reps qualify and advance opportunities.
            </div>
          ) : (
            <div className="space-y-fib-8">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="p-fib-13 rounded-md bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-neutral-900 block truncate max-w-[140px]">{deal.title}</span>
                    <span className="text-[11px] text-neutral-500">${deal.value.toLocaleString()}</span>
                  </div>
                  <span className="font-bold text-blue-700 bg-blue-50 px-fib-8 py-0.5 rounded border border-blue-200 text-[10px]">
                    {deal.stage}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
