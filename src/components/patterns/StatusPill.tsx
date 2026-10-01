import { cn } from '@/utils/cn';

export type StatusVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'ai';

const VARIANT_STYLES: Record<StatusVariant, { bg: string; dot: string }> = {
  neutral: { bg: 'bg-neutral-100 text-neutral-700 border-neutral-200', dot: 'bg-neutral-400' },
  info: { bg: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-600' },
  success: { bg: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-600' },
  warning: { bg: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-600' },
  danger: { bg: 'bg-rose-100 text-rose-700 border-rose-200', dot: 'bg-rose-600' },
  ai: { bg: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-600' },
};

interface StatusPillProps {
  label: string;
  variant?: StatusVariant;
  dot?: boolean;
  className?: string;
}

export function StatusPill({ label, variant = 'neutral', dot = true, className }: StatusPillProps) {
  const current = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-fib-5 px-fib-8 py-fib-2 rounded-pill text-[11px] font-semibold border select-none tracking-tight relative overflow-hidden',
        current.bg,
        className
      )}
    >
      <span className="absolute top-0 left-0 right-0 h-[1px] bg-white/40 pointer-events-none" />
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', current.dot)} />}
      {label}
    </span>
  );
}
