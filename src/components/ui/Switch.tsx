import { cn } from '@/utils/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function Switch({ checked, onChange, disabled, label, className }: SwitchProps) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-fib-8 cursor-pointer select-none text-xs font-medium text-neutral-700',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'w-9 h-5 rounded-pill p-0.5 transition-colors duration-200 ease-in-out relative',
          checked ? 'bg-blue-600 shadow-inner' : 'bg-neutral-300 shadow-inner'
        )}
      >
        <div
          className={cn(
            'w-4 h-4 rounded-full bg-white shadow-elevation-1 transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-4 bg-white' : 'translate-x-0'
          )}
        />
      </div>
      {label && <span>{label}</span>}
    </label>
  );
}
