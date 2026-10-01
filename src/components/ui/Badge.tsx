import { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export type BadgeVariant = 'neutral' | 'blue' | 'green' | 'amber' | 'rose' | 'violet';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, { bg: string; dot: string }> = {
    neutral: { bg: 'bg-neutral-100 text-neutral-700 border-neutral-200', dot: 'bg-neutral-500' },
    blue: { bg: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
    green: { bg: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' },
    amber: { bg: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
    rose: { bg: 'bg-rose-100 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
    violet: { bg: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  };

  const sizeStyles = {
    sm: 'px-fib-5 py-fib-2 text-[10px] gap-fib-3',
    md: 'px-fib-8 py-fib-3 text-xs gap-fib-5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-pill border select-none tracking-tight relative overflow-hidden',
        sizeStyles[size],
        variantStyles[variant].bg,
        className
      )}
      {...props}
    >
      <span className="absolute top-0 left-0 right-0 h-[1px] bg-white/40 pointer-events-none" />
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', variantStyles[variant].dot)} />}
      {children}
    </span>
  );
}
