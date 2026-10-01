import React from 'react';
import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KPICardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaDirection?: 'up' | 'down' | 'flat';
  deltaLabel?: string;
  accent?: 'blue' | 'green' | 'neutral' | 'rose' | 'amber' | 'violet';
  icon?: React.ReactNode;
  subtext?: string;
  className?: string;
}

export function KPICard({
  label,
  value,
  delta,
  deltaDirection = 'flat',
  deltaLabel,
  accent = 'blue',
  icon,
  subtext,
  className,
}: KPICardProps) {
  const accentTopBorders = {
    blue: 'border-t-blue-500',
    green: 'border-t-green-500',
    neutral: 'border-t-neutral-400',
    rose: 'border-t-rose-500',
    amber: 'border-t-amber-500',
    violet: 'border-t-violet-500',
  };

  const iconBgAccents = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    neutral: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
  };

  const deltaColors = {
    up: 'text-green-700 bg-green-50 border-green-200',
    down: 'text-rose-700 bg-rose-50 border-rose-200',
    flat: 'text-neutral-600 bg-neutral-100 border-neutral-200',
  };

  const deltaIcons = {
    up: <TrendingUp className="w-3 h-3" />,
    down: <TrendingDown className="w-3 h-3" />,
    flat: <Minus className="w-3 h-3" />,
  };

  return (
    <div
      className={cn(
        'skeuo-raised-2 p-fib-21 rounded-md bg-white border border-neutral-200 border-t-2 relative overflow-hidden transition-all duration-200 hover:shadow-elevation-3',
        accentTopBorders[accent],
        className
      )}
    >
      <div className="flex items-center justify-between gap-fib-8 mb-fib-8">
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 truncate">
          {label}
        </span>
        {icon && (
          <div className={cn('p-fib-5 rounded-md border text-sm', iconBgAccents[accent])}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-fib-8 mb-fib-5">
        <span className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-neutral-900 tabular-nums">
          {value}
        </span>
      </div>

      {(delta || subtext) && (
        <div className="flex items-center gap-fib-8 mt-fib-8 pt-fib-8 border-t border-neutral-100 text-xs">
          {delta && (
            <span
              className={cn(
                'inline-flex items-center gap-fib-3 px-fib-5 py-fib-2 rounded-sm border font-semibold tabular-nums text-[11px]',
                deltaColors[deltaDirection]
              )}
            >
              {deltaIcons[deltaDirection]}
              {delta}
            </span>
          )}
          <span className="text-[11px] text-neutral-500 truncate">
            {deltaLabel || subtext}
          </span>
        </div>
      )}
    </div>
  );
}
