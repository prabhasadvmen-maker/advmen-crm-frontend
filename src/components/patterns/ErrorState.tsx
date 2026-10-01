import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading this section.',
  action,
  compact = false,
}: ErrorStateProps) {
  if (compact) {
    return (
      <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="font-medium">{title}</span>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-rose-700 hover:text-rose-900 font-semibold underline flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            {action.label}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="skeuo-raised-1 p-6 rounded-md bg-white border border-rose-200 text-center flex flex-col items-center justify-center my-2">
      <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5 text-rose-500" />
      </div>
      <h4 className="text-sm font-semibold text-neutral-900 mb-1">{title}</h4>
      <p className="text-xs text-neutral-500 max-w-sm mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="skeuo-btn-secondary px-3 py-1.5 rounded-sm text-xs font-medium flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {action.label}
        </button>
      )}
    </div>
  );
}
