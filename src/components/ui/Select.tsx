import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  icon?: React.ReactNode;
}

export interface SelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  error?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  name?: string;
  id?: string;
  required?: boolean;
}

export function Select({
  label,
  placeholder = 'Select an option',
  value,
  onChange,
  options = [],
  error,
  disabled = false,
  className,
  buttonClassName,
  menuClassName,
  id,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const openTimeRef = useRef<number>(0);

  const selectedOption = options.find((opt) => opt.value === value);

  // Check vertical space and determine whether to open upward or downward
  useEffect(() => {
    if (isOpen && containerRef.current) {
      openTimeRef.current = Date.now();
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // If space below is less than 240px and space above is larger, flip upward
      if (spaceBelow < 240 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      // Ignore scroll events during the first 250ms of opening (prevents focus/layout micro-scroll glitch)
      if (Date.now() - openTimeRef.current < 250) {
        return;
      }
      const target = e.target as Node | null;
      // If the scroll event originated from inside this dropdown container or menu, do NOT close
      if (containerRef.current && target && containerRef.current.contains(target)) {
        return;
      }
      // Only close if scrolling the main window or an ancestor
      if (e.target === window || e.target === document) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
          onChange?.(options[nextIndex].value);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
          onChange?.(options[prevIndex].value);
        }
      }
    },
    [disabled, isOpen, options, value, onChange]
  );

  const handleSelect = (optionValue: string) => {
    if (disabled) return;
    onChange?.(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={cn('w-full text-left relative', className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-neutral-700 tracking-tight mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Main Select Trigger Box */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-neutral-900 bg-white border rounded-lg transition-all outline-none select-none cursor-pointer',
          isOpen
            ? 'border-sky-400 ring-2 ring-sky-100 shadow-sm'
            : 'border-neutral-300 hover:border-neutral-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100',
          error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-100',
          disabled && 'bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-60',
          buttonClassName
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className={cn('truncate', !selectedOption && 'text-neutral-400 font-normal')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {selectedOption.badge}
            </span>
          )}
        </span>

        <span className="ml-2 shrink-0 text-neutral-400">
          <ChevronDown
            className={cn('w-3.5 h-3.5 transition-transform duration-200', isOpen && 'rotate-180 text-sky-600')}
          />
        </span>
      </button>

      {/* Dropdown Options List Container (Image 2 style) */}
      {isOpen && (
        <div
          role="listbox"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          className={cn(
            'absolute left-0 right-0 z-50 bg-white border border-neutral-200 rounded-lg shadow-xl overflow-hidden max-h-56 overflow-y-auto overscroll-contain animate-in fade-in zoom-in-95 duration-100 divide-y divide-neutral-100',
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            menuClassName
          )}
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-xs text-neutral-400 text-center">No options available</div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;

              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer select-none group',
                    isSelected
                      ? 'bg-sky-50/80 text-sky-950 font-semibold'
                      : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {opt.icon && <span className="shrink-0 text-neutral-500 group-hover:text-neutral-700">{opt.icon}</span>}
                    <div className="truncate">
                      <span className="block truncate font-medium text-neutral-800">{opt.label}</span>
                      {opt.description && (
                        <span className="block text-[10px] text-neutral-400 font-normal truncate mt-0.5">
                          {opt.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {error && <p className="text-xs text-rose-500 font-medium mt-1">{error}</p>}
    </div>
  );
}
