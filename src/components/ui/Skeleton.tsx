import { cn } from '@/utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'table-row';
}

export function Skeleton({ className, variant = 'text' }: SkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={cn('skeuo-raised-2 p-5 rounded-md animate-pulse space-y-4 bg-white', className)}>
        <div className="h-4 bg-neutral-200 rounded w-1/3" />
        <div className="h-8 bg-neutral-200 rounded w-1/2" />
        <div className="h-3 bg-neutral-100 rounded w-full" />
        <div className="h-3 bg-neutral-100 rounded w-4/5" />
      </div>
    );
  }

  if (variant === 'table-row') {
    return (
      <div className={cn('flex items-center gap-4 py-3 px-4 border-b border-neutral-200 animate-pulse', className)}>
        <div className="w-8 h-8 rounded-full bg-neutral-200 shrink-0" />
        <div className="h-4 bg-neutral-200 rounded w-1/4" />
        <div className="h-4 bg-neutral-100 rounded w-1/5" />
        <div className="h-4 bg-neutral-100 rounded w-1/6" />
        <div className="h-4 bg-neutral-200 rounded w-16 ml-auto" />
      </div>
    );
  }

  const variantStyles = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-neutral-200/80',
        variantStyles[variant] || variantStyles.text,
        className
      )}
    />
  );
}
