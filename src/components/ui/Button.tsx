import React, { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'ghost' | 'ai';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      icon,
      iconPosition = 'left',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Fibonacci padding proportions
    const sizeClasses = {
      xs: 'px-fib-8 py-fib-3 text-xs gap-fib-3',
      sm: 'px-fib-13 py-fib-5 text-xs gap-fib-5',
      md: 'px-fib-21 py-fib-8 text-sm gap-fib-8',
      lg: 'px-fib-34 py-fib-13 text-base gap-fib-13',
    };

    const variantClasses = {
      primary: 'skeuo-btn-primary font-medium text-white',
      secondary: 'skeuo-btn-secondary font-medium text-neutral-700',
      outline: 'skeuo-btn-secondary font-medium text-neutral-700 border border-neutral-300 bg-white hover:bg-neutral-50',
      success: 'skeuo-btn-success font-medium text-white',
      danger: 'skeuo-btn-danger font-medium text-white',
      ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100/80 active:bg-neutral-200/80 hover:text-neutral-900 border border-transparent shadow-none',
      ai: 'bg-gradient-to-b from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-600 text-white border border-violet-700 shadow-elevation-1 active:shadow-pressed',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-sans tracking-tight transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
        {!isLoading && icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
        {children && <span>{children}</span>}
        {!isLoading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
