import { ActivityEvent } from '@/types';
import { Phone, Mail, MessageSquare, ArrowRightLeft, FileText, CheckCircle, Calendar, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';
import { EmptyState } from './EmptyState';

interface TimelineProps {
  events: ActivityEvent[];
  className?: string;
}

export function Timeline({ events, className }: TimelineProps) {
  if (events.length === 0) {
    return <EmptyState title="No activity recorded yet" description="Outbound calls, emails, notes and stage updates will appear here." />;
  }

  const iconMap = {
    CALL: <Phone className="w-3.5 h-3.5 text-blue-600" />,
    EMAIL: <Mail className="w-3.5 h-3.5 text-indigo-600" />,
    WHATSAPP: <MessageSquare className="w-3.5 h-3.5 text-green-600" />,
    STAGE_CHANGE: <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />,
    NOTE: <FileText className="w-3.5 h-3.5 text-neutral-600" />,
    TASK: <CheckCircle className="w-3.5 h-3.5 text-rose-600" />,
    MEETING: <Calendar className="w-3.5 h-3.5 text-teal-600" />,
    AI_INSIGHT: <Sparkles className="w-3.5 h-3.5 text-violet-600" />,
  };

  const badgeBgs = {
    CALL: 'bg-blue-50 border-blue-200',
    EMAIL: 'bg-indigo-50 border-indigo-200',
    WHATSAPP: 'bg-green-50 border-green-200',
    STAGE_CHANGE: 'bg-amber-50 border-amber-200',
    NOTE: 'bg-neutral-100 border-neutral-200',
    TASK: 'bg-rose-50 border-rose-200',
    MEETING: 'bg-teal-50 border-teal-200',
    AI_INSIGHT: 'bg-violet-50 border-violet-200',
  };

  return (
    <div className={cn('relative pl-6 space-y-fib-21 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-neutral-200', className)}>
      {events.map((event) => (
        <div key={event.id} className="relative group">
          <div
            className={cn(
              'absolute -left-6 top-0 w-6 h-6 rounded-full border skeuo-raised-1 flex items-center justify-center -translate-x-1/2 bg-white',
              badgeBgs[event.type]
            )}
          >
            {iconMap[event.type] || <FileText className="w-3 h-3 text-neutral-500" />}
          </div>

          <div className="skeuo-raised-1 bg-white p-fib-13 rounded-md border border-neutral-200 hover:border-neutral-300 transition-colors">
            <div className="flex items-center justify-between gap-fib-8 mb-fib-3">
              <span className="text-xs font-semibold text-neutral-900">{event.title}</span>
              <span className="text-[11px] text-neutral-400 font-mono tabular-nums">{event.timestamp}</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">{event.description}</p>
            <div className="mt-fib-8 pt-fib-8 border-t border-neutral-100 flex items-center gap-fib-8 text-[11px] text-neutral-400">
              <span className="font-medium text-neutral-700">{event.actorName}</span>
              <span>•</span>
              <span className="uppercase text-[10px] tracking-wider font-semibold">{event.type.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
