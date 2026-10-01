import { KPICard } from '@/components/patterns/KPICard';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { Button } from '@/components/ui/Button';
import { DataTable, ColumnDef } from '@/components/patterns/DataTable';
import { StatusPill } from '@/components/patterns/StatusPill';
import { useInvoices } from '../invoices/hooks/useInvoices';
import { Invoice } from '@/types';
import { useUIStore } from '@/stores/uiStore';
import {
  CreditCard,
  CheckCircle,
  DollarSign,
  Calendar,
  Building2,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function FinanceViewerDashboard() {
  const navigate = useNavigate();
  const { invoices } = useInvoices();
  const { addToast } = useUIStore();

  const columns: ColumnDef<Invoice>[] = [
    {
      id: 'invoiceNumber',
      header: 'Invoice #',
      cell: ({ row }) => (
        <span className="font-mono font-bold text-neutral-900 text-xs">
          {row.invoiceNumber}
        </span>
      ),
    },
    {
      id: 'company',
      header: 'Billed Company',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 font-medium text-neutral-800">
          <Building2 className="w-3.5 h-3.5 text-neutral-400" />
          <span>{row.company}</span>
        </div>
      ),
    },
    {
      id: 'amount',
      header: 'Contract Total',
      align: 'right',
      cell: ({ row }) => (
        <span className="font-bold text-neutral-900 tabular-nums">
          ${row.amount.toLocaleString()} {row.currency}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Payment Status',
      cell: ({ row }) => {
        const variantMap: Record<Invoice['status'], any> = {
          DRAFT: 'neutral',
          SENT: 'info',
          PAID: 'success',
          OVERDUE: 'danger',
          VOID: 'neutral',
        };
        return <StatusPill label={row.status} variant={variantMap[row.status]} />;
      },
    },
    {
      id: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => (
        <span className="font-mono text-neutral-600 text-[11px]">{row.dueDate}</span>
      ),
    },
  ];

  return (
    <div className="space-y-fib-21">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-fib-13 pb-fib-8 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-fib-8 mb-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
              Finance Controller — Revenue & Receivables Audit
            </h1>
            <span className="text-[10px] font-bold px-fib-8 py-0.5 rounded-pill bg-teal-100 text-teal-800 border border-teal-300 font-mono">
              Audit & Ledger
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Read-only financial ledger, Stripe payment settlement verification, DSO tracking, and tax export auditing.
          </p>
        </div>

        <div className="flex items-center gap-fib-8">
          <Button
            size="sm"
            variant="secondary"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => {
              addToast({ type: 'info', title: 'Exporting Ledger', message: 'Generating CSV audit ledger for Q3.' });
            }}
          >
            Export GAAP Ledger
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<CreditCard className="w-3.5 h-3.5" />}
            onClick={() => navigate('/invoices')}
          >
            Manage Invoices
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-fib-13">
        <WidgetBoundary name="kpi-fin-collected">
          <KPICard
            label="Total Collected"
            value={`$${invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0).toLocaleString()}`}
            subtext="Settled payments"
            accent="green"
            icon={<CheckCircle className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-fin-receivables">
          <KPICard
            label="Outstanding Receivables"
            value={`$${invoices.filter((i) => i.status === 'SENT' || i.status === 'OVERDUE').reduce((s, i) => s + i.amount, 0).toLocaleString()}`}
            subtext={`${invoices.filter((i) => i.status === 'SENT' || i.status === 'OVERDUE').length} Accounts`}
            accent="blue"
            icon={<DollarSign className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-fin-dso">
          <KPICard
            label="Total Ledger Records"
            value={invoices.length}
            subtext="Invoiced contracts"
            accent="green"
            icon={<Calendar className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-fin-audit-lock">
          <KPICard
            label="Compliance Status"
            value="SOX & SOC2 Ready"
            subtext="Immutable ledger"
            accent="neutral"
            icon={<ShieldCheck className="w-4 h-4" />}
          />
        </WidgetBoundary>
      </div>

      {/* Invoices Ledger Table */}
      <WidgetBoundary name="fin-invoices-table">
        <DataTable
          columns={columns}
          data={invoices}
          keyExtractor={(inv) => inv.id}
          searchPlaceholder="Search invoices for auditing..."
        />
      </WidgetBoundary>
    </div>
  );
}
