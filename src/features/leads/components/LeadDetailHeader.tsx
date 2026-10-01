import { Lead } from '@/types';
import { LeadScoreBadge } from './LeadScoreBadge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Select } from '@/components/ui/Select';
import { Phone, Mail, Building2, DollarSign, UserCheck } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

interface LeadDetailHeaderProps {
  lead: Lead;
  onCallClick?: () => void;
  onEmailClick?: () => void;
  onStatusChange?: (newStatus: Lead['status']) => void;
}

export function LeadDetailHeader({ lead, onCallClick, onEmailClick, onStatusChange }: LeadDetailHeaderProps) {
  const { addToast } = useUIStore();

  return (
    <div className="skeuo-raised-2 bg-white rounded-md border border-neutral-200 p-fib-21 space-y-fib-13">
      {/* Top row: Name, score, and fast communication actions */}
      <div className="flex flex-wrap items-start justify-between gap-fib-13">
        <div className="flex items-center gap-fib-13">
          <Avatar name={lead.name} size="lg" status="online" />
          <div>
            <div className="flex items-center gap-fib-8 mb-1">
              <h2 className="text-lg font-bold text-neutral-900">{lead.name}</h2>
              <LeadScoreBadge score={lead.score} category={lead.scoreCategory} />
              <div className="w-36">
                <Select
                  value={lead.status}
                  onChange={(val) => onStatusChange?.(val as Lead['status'])}
                  options={[
                    { value: 'NEW', label: 'NEW' },
                    { value: 'CONTACTED', label: 'CONTACTED' },
                    { value: 'QUALIFIED', label: 'QUALIFIED ★' },
                    { value: 'NURTURING', label: 'NURTURING' },
                    { value: 'UNQUALIFIED', label: 'UNQUALIFIED' },
                    { value: 'CONVERTED', label: 'CONVERTED' },
                  ]}
                />
              </div>
            </div>
            <div className="flex items-center gap-fib-8 text-xs text-neutral-500">
              <span className="font-medium text-neutral-800">{lead.title}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-neutral-400" />
                {lead.company}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-fib-8">
          <Button
            size="sm"
            variant="success"
            icon={<Phone className="w-3.5 h-3.5" />}
            onClick={() => {
              addToast({ type: 'success', title: `Dialing ${lead.phone}...`, message: 'Connecting through ADVMEN voice bridge' });
              onCallClick?.();
            }}
          >
            Call Lead
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<Mail className="w-3.5 h-3.5" />}
            onClick={() => {
              addToast({ type: 'info', title: `Opening composer for ${lead.email}` });
              onEmailClick?.();
            }}
          >
            Email
          </Button>
        </div>
      </div>

      {/* Grid Meta Information Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-fib-13 pt-fib-13 border-t border-neutral-100 text-xs">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Estimated Value
          </span>
          <span className="font-bold text-neutral-900 tabular-nums flex items-center gap-0.5 mt-0.5">
            <DollarSign className="w-3 h-3 text-green-600" />
            ${lead.estimatedValue.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Assigned Owner
          </span>
          <span className="font-semibold text-neutral-800 flex items-center gap-1.5 mt-0.5">
            <UserCheck className="w-3 h-3 text-blue-600" />
            {lead.assignedTo?.name || 'Unassigned'}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Lead Source
          </span>
          <span className="font-medium text-neutral-700 mt-0.5 block">
            {lead.source.replace('_', ' ')}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
            Last Activity
          </span>
          <span className="font-medium text-neutral-700 mt-0.5 block">
            {lead.lastContactedAt || 'Never'}
          </span>
        </div>
      </div>
    </div>
  );
}
