import React from 'react';
import { cn } from '@/utils/cn';
import { Sparkles, Check, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface AIContentCardProps {
  title?: string;
  badgeLabel?: string;
  content: string | React.ReactNode;
  intentLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedAction?: string;
  keyPoints?: string[];
  status?: 'suggested' | 'approved';
  onApprove?: () => void;
  onDiscard?: () => void;
  onApplyAction?: () => void;
  className?: string;
}

export function AIContentCard({
  title = 'AI Copilot Insight',
  badgeLabel = 'AI Suggestion',
  content,
  intentLevel,
  suggestedAction,
  keyPoints,
  status = 'suggested',
  onApprove,
  onDiscard,
  onApplyAction,
  className,
}: AIContentCardProps) {
  const intentColors = {
    HIGH: 'bg-green-100 text-green-800 border-green-200',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
    LOW: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  };

  return (
    <div
      className={cn(
        'skeuo-raised-2 rounded-md bg-gradient-to-br from-white to-violet-50/40 border border-violet-200 p-fib-13 relative overflow-hidden transition-all',
        className
      )}
    >
      {/* Top violet accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />

      {/* Header */}
      <div className="flex items-center justify-between gap-fib-8 mb-fib-8">
        <div className="flex items-center gap-fib-8">
          <div className="p-fib-3 rounded bg-violet-100 text-violet-700 border border-violet-200">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-bold text-neutral-900 tracking-tight">{title}</h4>
        </div>
        <div className="flex items-center gap-fib-5">
          {intentLevel && (
            <span
              className={cn(
                'text-[10px] font-bold px-fib-5 py-fib-1 rounded-pill border uppercase tracking-wider',
                intentColors[intentLevel]
              )}
            >
              {intentLevel} INTENT
            </span>
          )}
          <span className="text-[10px] font-semibold px-fib-5 py-fib-1 rounded-pill bg-violet-100 text-violet-800 border border-violet-300">
            {status === 'approved' ? '✓ Confirmed' : badgeLabel}
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div className="text-xs text-neutral-700 leading-relaxed space-y-fib-8">
        {typeof content === 'string' ? <p>{content}</p> : content}

        {keyPoints && keyPoints.length > 0 && (
          <div className="bg-white/80 rounded border border-violet-100 p-fib-8 space-y-fib-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-800 block">
              Key Signal Drivers
            </span>
            <ul className="space-y-fib-3">
              {keyPoints.map((pt, i) => (
                <li key={i} className="text-[11px] text-neutral-600 flex items-start gap-fib-5">
                  <span className="text-violet-500 font-bold">•</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {suggestedAction && (
          <div className="bg-violet-50/80 border border-violet-200 rounded p-fib-8 flex items-center justify-between gap-fib-8">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700 block">
                Next Best Action
              </span>
              <span className="text-xs font-semibold text-neutral-900">{suggestedAction}</span>
            </div>
            {onApplyAction && (
              <Button
                size="xs"
                variant="ai"
                onClick={onApplyAction}
                icon={<ArrowRight className="w-3 h-3" />}
                iconPosition="right"
              >
                Execute
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Action Bar (Gated Approval) */}
      {(onApprove || onDiscard) && status === 'suggested' && (
        <div className="mt-fib-8 pt-fib-8 border-t border-violet-100 flex items-center justify-end gap-fib-5">
          {onDiscard && (
            <Button
              size="xs"
              variant="ghost"
              onClick={onDiscard}
              icon={<Trash2 className="w-3 h-3" />}
            >
              Discard
            </Button>
          )}
          {onApprove && (
            <Button
              size="xs"
              variant="primary"
              onClick={onApprove}
              icon={<Check className="w-3 h-3" />}
            >
              Approve & Apply
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
