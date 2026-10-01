import { Deal, DealStage } from '@/types';
import { cn } from '@/utils/cn';
import { DollarSign, Building2, User, Trash2, ArrowRight } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

export interface KanbanColumn {
  id: DealStage;
  label: string;
  accent: 'blue' | 'green' | 'amber' | 'rose' | 'neutral';
}

interface KanbanBoardProps {
  stages: KanbanColumn[];
  deals: Deal[];
  onDealClick?: (deal: Deal) => void;
  onMoveDealStage?: (dealId: string, targetStage: DealStage) => void;
  onDeleteDeal?: (deal: Deal) => void;
}

export function KanbanBoard({ stages, deals, onDealClick, onMoveDealStage, onDeleteDeal }: KanbanBoardProps) {
  const getStageDeals = (stageId: DealStage) => deals.filter((d) => d.stage === stageId);

  const getStageTotal = (stageId: DealStage) => {
    return deals
      .filter((d) => d.stage === stageId)
      .reduce((sum, d) => sum + d.value, 0);
  };

  const accentColors = {
    blue: 'border-t-blue-500 bg-blue-50/50',
    green: 'border-t-green-500 bg-green-50/50',
    amber: 'border-t-amber-500 bg-amber-50/50',
    rose: 'border-t-rose-500 bg-rose-50/50',
    neutral: 'border-t-neutral-400 bg-neutral-100/50',
  };

  return (
    <div className="flex gap-fib-13 overflow-x-auto pb-fib-13 items-start select-none">
      {stages.map((stage) => {
        const stageDeals = getStageDeals(stage.id);
        const stageTotal = getStageTotal(stage.id);

        return (
          <div
            key={stage.id}
            className="w-72 shrink-0 bg-neutral-100/80 rounded-lg border border-neutral-200/80 flex flex-col max-h-[calc(100vh-220px)]"
          >
            {/* Column Header */}
            <div className={cn('p-fib-13 border-b border-neutral-200 border-t-2 rounded-t-lg bg-white', accentColors[stage.accent])}>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-neutral-800 tracking-tight">{stage.label}</span>
                <span className="text-[11px] font-semibold px-fib-8 py-0.2 rounded-pill bg-neutral-100 text-neutral-600 border border-neutral-200 tabular-nums">
                  {stageDeals.length}
                </span>
              </div>
              <div className="text-xs font-bold text-neutral-900 tabular-nums flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-neutral-400" />
                ${stageTotal.toLocaleString()}
              </div>
            </div>

            {/* Column Cards Container */}
            <div className="p-fib-8 space-y-fib-8 overflow-y-auto flex-1">
              {stageDeals.length === 0 ? (
                <div className="p-fib-13 text-center border-2 border-dashed border-neutral-200 rounded-md text-xs text-neutral-400">
                  No deals in this stage
                </div>
              ) : (
                stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    onClick={() => onDealClick && onDealClick(deal)}
                    className="skeuo-raised-1 bg-white p-fib-13 rounded-md border border-neutral-200/90 hover:shadow-elevation-2 hover:border-neutral-300 transition-all duration-150 cursor-pointer space-y-fib-8 group relative"
                  >
                    <div className="flex items-start justify-between gap-fib-8">
                      <h4 className="text-xs font-bold text-neutral-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {deal.title}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0">
                        {deal.health === 'AT_RISK' && (
                          <span className="text-[10px] px-fib-5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold">
                            At Risk
                          </span>
                        )}
                        {onDeleteDeal && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDeal(deal);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-all"
                            title="Delete opportunity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-fib-3 text-xs text-neutral-500">
                      <div className="flex items-center gap-fib-5 truncate">
                        <Building2 className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">{deal.company}</span>
                      </div>
                      <div className="flex items-center gap-fib-5 truncate">
                        <User className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="truncate">{deal.contactName}</span>
                      </div>
                    </div>

                    {/* Footer: Value & Owner & Stage Fast Move Menu */}
                    <div className="pt-fib-8 border-t border-neutral-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-900 tabular-nums">
                        ${deal.value.toLocaleString()}
                      </span>

                      <div className="flex items-center gap-2">
                        {onMoveDealStage && (
                          <div
                            className="relative"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={deal.stage}
                              onChange={(e) =>
                                onMoveDealStage(deal.id, e.target.value as DealStage)
                              }
                              className="text-[10px] bg-neutral-50 hover:bg-neutral-100 focus:bg-white rounded-md px-2 py-1 border border-neutral-200 hover:border-neutral-300 font-semibold text-neutral-700 shadow-sm outline-none cursor-pointer transition-colors appearance-none pr-5 relative"
                              title="Move stage"
                            >
                              {stages.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <ArrowRight className="w-2.5 h-2.5 text-neutral-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        )}
                        <Avatar name={deal.assignedTo?.name || 'Deal Owner'} size="xs" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
