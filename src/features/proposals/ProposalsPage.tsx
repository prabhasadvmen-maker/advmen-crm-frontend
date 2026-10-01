import { useState } from 'react';
import { Proposal } from '@/types';
import { DataTable, ColumnDef } from '@/components/patterns/DataTable';
import { KPICard } from '@/components/patterns/KPICard';
import { StatusPill } from '@/components/patterns/StatusPill';
import { SlideOverPanel } from '@/components/patterns/SlideOverPanel';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { PermissionGate } from '@/components/system/PermissionGate';
import { useProposals } from './hooks/useProposals';
import {
  FileText,
  DollarSign,
  Send,
  CheckCircle,
  Plus,
  Building2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export function ProposalsPage() {
  const { proposals, createProposal, updateStatus, deleteProposal, isCreating, isDeleting } = useProposals();
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<Proposal | null>(null);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [newAmount, setNewAmount] = useState('75000');

  const handleSendProposal = async (prop: Proposal) => {
    await updateStatus({ id: prop.id, status: 'SENT' });
    if (selectedProposal && selectedProposal.id === prop.id) {
      setSelectedProposal({ ...selectedProposal, status: 'SENT' });
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany || !newAmount) return;

    await createProposal({
      dealTitle: newTitle || `${newCompany} Expansion Contract`,
      company: newCompany,
      recipientName: newRecipientName || 'Decision Maker',
      recipientEmail: newRecipientEmail || `procurement@${newCompany.toLowerCase().replace(/\s+/g, '')}.com`,
      amount: Number(newAmount) || 75000,
      validUntil: '2026-10-31',
    });

    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewCompany('');
    setNewRecipientName('');
    setNewRecipientEmail('');
  };

  const columns: ColumnDef<Proposal>[] = [
    {
      id: 'proposalNumber',
      header: 'Proposal #',
      sortable: true,
      cell: ({ row }) => (
        <span className="font-mono font-bold text-neutral-900 text-xs">
          {row.proposalNumber}
        </span>
      ),
    },
    {
      id: 'dealTitle',
      header: 'Opportunity & Company',
      cell: ({ row }) => (
        <div>
          <span className="font-bold text-neutral-900 block">{row.dealTitle}</span>
          <div className="flex items-center gap-1 text-[11px] text-neutral-500">
            <Building2 className="w-3 h-3 text-neutral-400" />
            <span>{row.company}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      cell: ({ row }) => (
        <span className="font-bold text-neutral-900 tabular-nums">
          ${row.amount.toLocaleString()}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      cell: ({ row }) => {
        const variantMap: Record<Proposal['status'], any> = {
          DRAFT: 'neutral',
          SENT: 'info',
          VIEWED: 'warning',
          ACCEPTED: 'success',
          DECLINED: 'danger',
        };
        return <StatusPill label={row.status} variant={variantMap[row.status]} />;
      },
    },
    {
      id: 'validUntil',
      header: 'Valid Until',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-neutral-500">{row.validUntil}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setProposalToDelete(row);
          }}
          className="p-1 rounded hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-colors"
          title="Delete proposal"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-fib-21">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-fib-13 pb-fib-8 border-b border-neutral-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            Proposals & Quotes
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure line items, generate PDF contracts, and track prospect engagement.
          </p>
        </div>

        <PermissionGate permission="proposal.create">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Proposal
          </Button>
        </PermissionGate>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-fib-13">
        <WidgetBoundary name="kpi-proposals-active">
          <KPICard
            label="Total Proposals Active"
            value={proposals.length}
            subtext="In negotiation"
            accent="blue"
            icon={<FileText className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-proposals-value">
          <KPICard
            label="Proposal Pipeline Value"
            value={`$${proposals.reduce((s, p) => s + p.amount, 0).toLocaleString()}`}
            subtext="Active contract value"
            accent="green"
            icon={<DollarSign className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-acceptance-rate">
          <KPICard
            label="Acceptance Rate"
            value={proposals.length ? `${Math.round((proposals.filter((p) => p.status === 'ACCEPTED').length / proposals.length) * 100)}%` : '0%'}
            subtext={`${proposals.filter((p) => p.status === 'ACCEPTED').length} accepted`}
            accent="green"
            icon={<CheckCircle className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-ai-quote-speed">
          <KPICard
            label="Proposals In Draft"
            value={proposals.filter((p) => p.status === 'DRAFT').length}
            subtext="Awaiting client dispatch"
            accent="neutral"
            icon={<FileText className="w-4 h-4" />}
          />
        </WidgetBoundary>
      </div>

      {/* Main Table */}
      <WidgetBoundary name="proposals-data-table">
        <DataTable
          columns={columns}
          data={proposals}
          keyExtractor={(prop) => prop.id}
          onRowClick={(prop) => setSelectedProposal(prop)}
          searchPlaceholder="Search proposals by number, company, or opportunity..."
        />
      </WidgetBoundary>

      {/* Modal for Creating Proposal */}
      <SlideOverPanel
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Client Proposal"
      >
        <form onSubmit={handleCreateProposal} className="space-y-fib-13 p-fib-13">
          <Input
            label="Contract / Deal Title"
            placeholder="Enterprise Platform & SLA Bundle"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Input
            label="Client Company Name *"
            placeholder="Acme Logistics Global"
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
            required
          />
          <Input
            label="Recipient Name"
            placeholder="Sarah Jenkins"
            value={newRecipientName}
            onChange={(e) => setNewRecipientName(e.target.value)}
          />
          <Input
            label="Recipient Email"
            type="email"
            placeholder="s.jenkins@acme.com"
            value={newRecipientEmail}
            onChange={(e) => setNewRecipientEmail(e.target.value)}
          />
          <Input
            label="Proposed Amount (USD) *"
            type="number"
            leftIcon={<DollarSign className="w-4 h-4" />}
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            required
          />

          <div className="pt-fib-13 border-t border-neutral-100 flex justify-end gap-fib-8">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isCreating}
              icon={<Plus className="w-4 h-4" />}
            >
              Save Draft Proposal
            </Button>
          </div>
        </form>
      </SlideOverPanel>

      {/* Modal for Proposal Preview */}
      <SlideOverPanel
        isOpen={!!selectedProposal}
        onClose={() => setSelectedProposal(null)}
        title={selectedProposal?.proposalNumber}
        subtitle={`${selectedProposal?.company} • ${selectedProposal?.dealTitle}`}
      >
        {selectedProposal && (
          <div className="space-y-fib-21 p-fib-13">
            {/* Header overview */}
            <div className="skeuo-raised-2 bg-white rounded-md border border-neutral-200 p-fib-21 flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider block">
                  Total Contract Value
                </span>
                <span className="text-3xl font-extrabold text-neutral-900 tabular-nums">
                  ${selectedProposal.amount.toLocaleString()}
                </span>
              </div>
              <Button
                variant={selectedProposal.status === 'SENT' ? 'secondary' : 'primary'}
                size="sm"
                icon={<Send className="w-3.5 h-3.5" />}
                onClick={() => handleSendProposal(selectedProposal)}
              >
                {selectedProposal.status === 'SENT' ? 'Resend to Client' : 'Send Proposal'}
              </Button>
            </div>

            {/* Document Preview Details */}
            <div className="skeuo-raised-1 bg-white rounded-md border border-neutral-200 p-fib-21 space-y-fib-13 text-xs">
              <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px] border-b border-neutral-100 pb-fib-8">
                Line Items & Licensing Terms
              </h4>
              <div className="space-y-fib-8 divide-y divide-neutral-100">
                <div className="flex items-center justify-between pt-fib-8">
                  <div>
                    <span className="font-bold text-neutral-900 block">ADVMEN SalesOS Enterprise Tier</span>
                    <span className="text-neutral-500 text-[11px]">50 Rep Seats • High Volume Voice & WhatsApp</span>
                  </div>
                  <span className="font-bold text-neutral-900 tabular-nums">
                    ${(selectedProposal.amount * 0.8).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-fib-8">
                  <div>
                    <span className="font-bold text-neutral-900 block">Dedicated RevOps SLA & Private VPC</span>
                    <span className="text-neutral-500 text-[11px]">99.99% Uptime SLA • 15m Emergency Bridge</span>
                  </div>
                  <span className="font-bold text-neutral-900 tabular-nums">
                    ${(selectedProposal.amount * 0.2).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Delete Proposal Option */}
            <div className="pt-fib-13 border-t border-neutral-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-neutral-800 block">Delete Proposal</span>
                <span className="text-[11px] text-neutral-500">Permanently discard this quote</span>
              </div>
              <Button
                size="xs"
                variant="danger"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => setProposalToDelete(selectedProposal)}
              >
                Delete Proposal
              </Button>
            </div>
          </div>
        )}
      </SlideOverPanel>

      {/* Delete Proposal Confirmation Dialog */}
      {proposalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-fib-13">
          <div
            onClick={() => setProposalToDelete(null)}
            className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative w-full max-w-md skeuo-raised-3 bg-white rounded-xl border border-neutral-200 p-fib-21 z-10 shadow-2xl space-y-fib-13">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-900">Delete Proposal</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Are you sure you want to delete proposal <strong className="text-neutral-900">{proposalToDelete.proposalNumber}</strong> ({proposalToDelete.company})?
                </p>
              </div>
            </div>

            <div className="pt-fib-8 border-t border-neutral-100 flex items-center justify-end gap-fib-8">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setProposalToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={isDeleting}
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={async () => {
                  await deleteProposal(proposalToDelete.id);
                  if (selectedProposal?.id === proposalToDelete.id) {
                    setSelectedProposal(null);
                  }
                  setProposalToDelete(null);
                }}
              >
                Delete Proposal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
