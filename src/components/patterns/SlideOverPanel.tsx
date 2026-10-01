import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SlideOverPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function SlideOverPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  actions,
  children,
  width = 'xl',
}: SlideOverPanelProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
      />

      {/* Modal Card */}
      <div
        className={cn(
          'relative w-full max-h-[90vh] skeuo-raised-3 bg-white rounded-2xl border border-neutral-200/90 flex flex-col z-10 shadow-2xl transition-all duration-200 ease-out animate-in zoom-in-95 overflow-hidden',
          widthClasses[width]
        )}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-100 bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 mb-1">
              <h3 className="text-base sm:text-lg font-bold text-neutral-900 truncate tracking-tight">{title}</h3>
              {badge}
            </div>
            {subtitle && <p className="text-xs text-neutral-500 truncate">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {actions}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {children}
        </div>
      </div>
    </div>
  );
}
