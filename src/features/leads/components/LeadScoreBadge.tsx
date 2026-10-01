import React from 'react';
import { LeadScoreCategory } from '@/types';
import { Flame, Sun, Snowflake } from 'lucide-react';
import { cn } from '@/utils/cn';

interface LeadScoreBadgeProps {
  score: number;
  category?: LeadScoreCategory;
  className?: string;
}

const config: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  HOT: {
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />,
    label: 'Hot',
  },
  WARM: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />,
    label: 'Warm',
  },
  COLD: {
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Snowflake className="w-3.5 h-3.5 text-blue-500" />,
    label: 'Cold',
  },
};

export function LeadScoreBadge({ score, category, className }: LeadScoreBadgeProps) {
  const rawCat = String(category || (score >= 80 ? 'HOT' : score >= 50 ? 'WARM' : 'COLD')).toUpperCase();
  const item = config[rawCat] || config.WARM;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-fib-5 px-fib-8 py-fib-2 rounded-pill border text-xs font-bold tabular-nums select-none shadow-sm relative overflow-hidden',
        item.bg,
        className
      )}
    >
      <span className="absolute top-0 left-0 right-0 h-[1px] bg-white/50 pointer-events-none" />
      {item.icon}
      <span>{score}</span>
      <span className="text-[10px] uppercase font-semibold text-neutral-500">({item.label})</span>
    </div>
  );
}
