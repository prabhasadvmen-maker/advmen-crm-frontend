import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingUp, DollarSign, Award, Target, RefreshCw, AlertCircle } from 'lucide-react';
import { KPICard } from '@/components/patterns/KPICard';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { reportApi } from './api/reportApi';

function formatRupees(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatCurrencyTotals(
  rows: Array<{ amount: number }>
): string {
  return formatRupees(rows.reduce((total, row) => total + (Number(row.amount) || 0), 0));
}

const STAGE_LABELS: Record<string, string> = {
  DISCOVERY: 'Discovery',
  QUALIFICATION: 'Qualification',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
};

export function ReportsPage() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['reports', 'overview'],
    queryFn: reportApi.getOverview,
    staleTime: 30_000,
    retry: 1,
  });

  const summary = data?.summary || [];
  const collectedPayments = data?.collectedPayments || [];
  const totals = data?.totals;
  const hasReportData = (totals?.totalDeals || 0) > 0 || collectedPayments.length > 0;
  const chartData = [
    {
      metric: 'Active Pipeline',
      amount: summary.reduce((total, item) => total + item.pipelineValue, 0),
    },
    {
      metric: 'Won Revenue',
      amount: summary.reduce((total, item) => total + item.wonRevenue, 0),
    },
    {
      metric: 'Collected Payments',
      amount: collectedPayments.reduce((total, item) => total + item.amount, 0),
    },
  ];

  return (
    <div className="space-y-fib-21">
      <div className="pb-fib-8 border-b border-neutral-200 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            Executive Reports & Pipeline Analytics
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Live revenue, deal-stage, and collection analytics from your organization database.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label="Refresh reports"
          className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error instanceof Error ? error.message : 'Unable to load reports from the database.'}</span>
          </div>
          <button type="button" onClick={() => void refetch()} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-fib-13">
        <WidgetBoundary name="kpi-won-revenue">
          <KPICard
            label="Won Booked Revenue"
            value={isLoading ? 'Loading…' : formatCurrencyTotals(summary.map((item) => ({ amount: item.wonRevenue })))}
            subtext={`${totals?.wonDeals || 0} won deals`}
            accent="green"
            icon={<DollarSign className="w-4 h-4" />}
          />
        </WidgetBoundary>
        <WidgetBoundary name="kpi-win-rate">
          <KPICard
            label="Win Rate"
            value={isLoading ? 'Loading…' : `${totals?.winRate || 0}%`}
            subtext={`${totals?.wonDeals || 0} won of ${totals?.closedDeals || 0} closed`}
            accent="green"
            icon={<Target className="w-4 h-4" />}
          />
        </WidgetBoundary>
        <WidgetBoundary name="kpi-active-deals">
          <KPICard
            label="Active Deals"
            value={isLoading ? 'Loading…' : (totals?.activeDeals || 0).toLocaleString()}
            subtext={`${formatCurrencyTotals(summary.map((item) => ({ amount: item.pipelineValue })))} active pipeline`}
            accent="blue"
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </WidgetBoundary>
        <WidgetBoundary name="kpi-cash-collected">
          <KPICard
            label="Cash Invoiced & Settled"
            value={isLoading ? 'Loading…' : formatCurrencyTotals(collectedPayments)}
            subtext="Paid invoices recorded in the database"
            accent="violet"
            icon={<Award className="w-4 h-4" />}
          />
        </WidgetBoundary>
      </div>

      {isLoading ? (
        <div className="flex min-h-64 items-center justify-center rounded-md border border-neutral-200 bg-white text-sm text-neutral-500">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Loading reports from the database…
        </div>
      ) : !isError && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-fib-21">
            <div className="lg:col-span-8 skeuo-raised-2 bg-white rounded-md border border-neutral-200 p-fib-21 space-y-fib-13">
              <div>
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Active Pipeline, Won Revenue & Payments
                </h3>
                <p className="text-xs text-neutral-500">
                  All amounts are shown in Indian Rupees (INR), from saved deals and paid invoices.
                </p>
              </div>
              {!hasReportData ? (
                <div className="flex h-64 items-center justify-center text-xs text-neutral-500">
                  No deal or payment records are available yet.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E1E5EA" />
                      <XAxis dataKey="metric" stroke="#6B7684" fontSize={11} />
                      <YAxis
                        stroke="#6B7684"
                        fontSize={11}
                        tickFormatter={(value) => formatRupees(Number(value))}
                      />
                      <Tooltip
                        formatter={(value) => [formatRupees(Number(value)), 'Amount']}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#CBD2D9',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="amount" name="Amount (INR)" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 skeuo-raised-2 bg-white rounded-md border border-neutral-200 p-fib-21 space-y-fib-13">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Deal Stages Breakdown
                </h3>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              {!data?.stages.length ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  No deal records in the database.
                </div>
              ) : (
                <div className="max-h-80 space-y-fib-8 overflow-y-auto">
                  {data.stages.map((stage) => (
                    <div
                      key={`${stage.stage}-${stage.currency}`}
                      className="p-fib-13 rounded-md bg-neutral-50 border border-neutral-200/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-neutral-900 block truncate">
                          {STAGE_LABELS[stage.stage] || stage.stage}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          {stage.count} {stage.count === 1 ? 'deal' : 'deals'} · {formatRupees(stage.value)}
                        </span>
                      </div>
                      <span className="shrink-0 font-bold text-blue-700 bg-blue-50 px-fib-8 py-0.5 rounded border border-blue-200 text-[10px]">
                        {stage.stage}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <section className="skeuo-raised-2 bg-white rounded-md border border-neutral-200 p-fib-21 space-y-fib-13">
            <div>
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Recently Updated Deals</h3>
              <p className="text-xs text-neutral-500">Latest deal records saved in this organization.</p>
            </div>
            {!data?.recentDeals.length ? (
              <div className="py-8 text-center text-xs text-neutral-500">No deals found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-xs">
                  <thead className="border-b border-neutral-200 text-[10px] uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="py-2 pr-3">Deal</th>
                      <th className="py-2 pr-3">Company</th>
                      <th className="py-2 pr-3">Value</th>
                      <th className="py-2 pr-3">Stage</th>
                      <th className="py-2">Last updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {data.recentDeals.map((deal) => (
                      <tr key={deal.id}>
                        <td className="py-3 pr-3 font-semibold text-neutral-900">{deal.title}</td>
                        <td className="py-3 pr-3 text-neutral-600">{deal.company || '—'}</td>
                        <td className="py-3 pr-3 text-neutral-700">{formatRupees(deal.value)}</td>
                        <td className="py-3 pr-3">
                          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                            {deal.stage}
                          </span>
                        </td>
                        <td className="py-3 text-neutral-500">
                          {deal.updatedAt ? new Date(deal.updatedAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
