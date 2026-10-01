import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon = <Inbox className="w-8 h-8 text-neutral-400" />,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="skeuo-raised-1 p-8 rounded-md bg-white border border-neutral-200 text-center flex flex-col items-center justify-center my-2">
      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3 text-neutral-400">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-neutral-800 mb-1">{title}</h4>
      {description && <p className="text-xs text-neutral-500 max-w-sm mb-4">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="skeuo-btn-primary px-3.5 py-1.5 rounded-sm text-xs font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
