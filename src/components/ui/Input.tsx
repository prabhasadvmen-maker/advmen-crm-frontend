import React, { InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { Search, X } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  onClear?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      rightElement,
      onClear,
      value,
      type = 'text',
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full space-y-fib-3 text-left">
        {label && (
          <label className="block text-xs font-semibold text-neutral-700 tracking-tight">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-fib-8 flex items-center pointer-events-none text-neutral-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            value={value}
            disabled={disabled}
            className={cn(
              'w-full rounded-md skeuo-sunken text-xs text-neutral-900 placeholder:text-neutral-400 py-fib-8 transition-all outline-none',
              leftIcon ? 'pl-fib-34' : 'pl-fib-13',
              rightElement || rightIcon || onClear ? 'pr-fib-34' : 'pr-fib-13',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-200',
              disabled && 'opacity-60 cursor-not-allowed bg-neutral-200/50',
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-fib-8 flex items-center text-neutral-400">
              {rightElement}
            </div>
          )}
          {!rightElement && onClear && value && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-fib-8 p-fib-3 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {!rightElement && !onClear && rightIcon && (
            <div className="absolute right-fib-8 flex items-center pointer-events-none text-neutral-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
        {helperText && !error && <p className="text-[11px] text-neutral-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export function SearchInput({
  className,
  placeholder = 'Search records, leads, deals...',
  ...props
}: InputProps) {
  return (
    <Input
      leftIcon={<Search className="w-4 h-4" />}
      placeholder={placeholder}
      className={cn('bg-neutral-100', className)}
      {...props}
    />
  );
}
