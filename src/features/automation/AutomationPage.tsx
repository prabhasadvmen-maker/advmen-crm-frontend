import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { SlideOverPanel } from '@/components/patterns/SlideOverPanel';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { useAutomations } from './hooks/useAutomations';
import { Plus, ArrowRight, Bell, Mail, PhoneCall, Zap, Play } from 'lucide-react';

export function AutomationPage() {
  const { automations, toggleStatus, createAutomation, isCreating } = useAutomations();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('');
  const [condition, setCondition] = useState('');
  const [action, setAction] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !trigger || !action) return;

    await createAutomation({
      name,
      trigger,
      condition: condition || 'True for all records',
      action,
      enabled: true,
    });

    setIsCreateModalOpen(false);
    setName('');
    setTrigger('');
    setCondition('');
    setAction('');
  };

  const getIcon = (actionText: string) => {
    const lower = actionText.toLowerCase();
    if (lower.includes('call') || lower.includes('phone') || lower.includes('voice')) {
      return <PhoneCall className="w-4 h-4 text-green-600" />;
    }
    if (lower.includes('email') || lower.includes('proposal') || lower.includes('quote')) {
      return <Mail className="w-4 h-4 text-blue-600" />;
    }
    if (lower.includes('slack') || lower.includes('notify') || lower.includes('alert')) {
      return <Bell className="w-4 h-4 text-rose-600" />;
    }
    return <Zap className="w-4 h-4 text-violet-600" />;
  };

  return (
    <div className="space-y-fib-21">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-fib-13 pb-fib-8 border-b border-neutral-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
            Revenue Automation & SLA Triggers
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Event-driven triggers, conditional routing, and automated multi-channel follow-up workflows.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          New Automation
        </Button>
      </div>

      {/* Workflow Rule Cards */}
      <WidgetBoundary name="automation-workflows-list">
        <div className="space-y-fib-13">
          {automations.map((rule) => (
            <div
              key={rule.id}
              className="skeuo-raised-2 bg-white rounded-xl border border-neutral-200 p-fib-21 space-y-fib-13 transition-all hover:border-neutral-300"
            >
              <div className="flex items-start justify-between gap-fib-13">
                <div className="flex items-center gap-fib-8">
                  <div className="p-fib-8 rounded-md bg-neutral-100 border border-neutral-200">
                    {getIcon(rule.action)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">{rule.name}</h3>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      Workflow ID: {rule.id}
                    </span>
                  </div>
                </div>

                <Switch
                  checked={rule.enabled}
                  onChange={(val) => toggleStatus({ id: rule.id, enabled: val })}
                  label={rule.enabled ? 'Active' : 'Disabled'}
                />
              </div>

              {/* Fibonacci 3-col sequence: Trigger -> Condition -> Action */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-fib-8 pt-fib-8 border-t border-neutral-100 text-xs">
                <div className="p-fib-13 rounded-md bg-blue-50/60 border border-blue-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-1">
                    1. When Trigger Occurs
                  </span>
                  <p className="font-semibold text-neutral-900">{rule.trigger}</p>
                </div>

                <div className="p-fib-13 rounded-md bg-amber-50/60 border border-amber-100 relative">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                    2. If Condition Matches
                  </span>
                  <p className="font-medium text-neutral-800">{rule.condition}</p>
                  <ArrowRight className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 z-10" />
                </div>

                <div className="p-fib-13 rounded-md bg-green-50/60 border border-green-100 relative">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 block mb-1">
                    3. Then Execute Action
                  </span>
                  <p className="font-semibold text-neutral-900">{rule.action}</p>
                  <ArrowRight className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 z-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </WidgetBoundary>

      {/* Create Automation SlideOver */}
      <SlideOverPanel
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Configure New Automation Workflow"
      >
        <form onSubmit={handleCreate} className="space-y-fib-13 p-fib-13">
          <Input
            label="Workflow Name"
            placeholder="Enterprise Inbound Fast Outreach SLA"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="1. Trigger Event"
            placeholder="New Lead Created with Score >= 80"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            required
          />
          <Input
            label="2. Condition Criteria (Optional)"
            placeholder="Lead source is Inbound Call or Website Form"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          />
          <Input
            label="3. Action Execution"
            placeholder="Assign to Senior AE & Send WhatsApp intro"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            required
          />

          <div className="pt-fib-13 flex justify-end gap-fib-8">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isCreating}
              icon={<Play className="w-3.5 h-3.5" />}
            >
              Deploy Workflow
            </Button>
          </div>
        </form>
      </SlideOverPanel>
    </div>
  );
}
