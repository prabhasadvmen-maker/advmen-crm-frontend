import { useUIStore } from '@/stores/uiStore';
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-green-600" />,
    info: <Info className="w-4 h-4 text-blue-600" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-600" />,
    danger: <AlertCircle className="w-4 h-4 text-rose-600" />,
    ai: <Sparkles className="w-4 h-4 text-violet-600" />,
  };

  const borderAccents = {
    success: 'border-l-green-500',
    info: 'border-l-blue-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-rose-500',
    ai: 'border-l-violet-500',
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-fib-8 pointer-events-none max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto skeuo-raised-3 bg-white p-fib-13 rounded-md border border-neutral-200 border-l-4 flex items-start gap-fib-13 transition-all transform animate-in slide-in-from-bottom-2 duration-200',
            borderAccents[t.type]
          )}
        >
          <div className="shrink-0 mt-0.5">{icons[t.type]}</div>
          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-semibold text-neutral-900">{t.title}</h5>
            {t.message && <p className="text-[11px] text-neutral-500 mt-0.5">{t.message}</p>}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="shrink-0 p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
