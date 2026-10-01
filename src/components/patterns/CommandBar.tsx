import { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { Search, UserPlus, PhoneCall, FileText, Sparkles, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CommandBar() {
  const { commandBarOpen, setCommandBarOpen } = useUIStore();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandBarOpen(!commandBarOpen);
      }
      if (e.key === 'Escape' && commandBarOpen) {
        setCommandBarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandBarOpen, setCommandBarOpen]);

  if (!commandBarOpen) return null;

  const quickActions = [
    { label: 'Create New Lead', icon: <UserPlus className="w-4 h-4 text-blue-600" />, path: '/leads' },
    { label: 'Start Telecaller Queue', icon: <PhoneCall className="w-4 h-4 text-green-600" />, path: '/calls' },
    { label: 'Generate Proposal', icon: <FileText className="w-4 h-4 text-amber-600" />, path: '/proposals' },
    { label: 'AI Intelligence Assistant', icon: <Sparkles className="w-4 h-4 text-violet-600" />, path: '/ai' },
  ];

  const sampleResults = [
    { type: 'Lead', title: 'Sarah Jenkins — Apex Capital', subtitle: 'Score: 94 (Hot) • Last active 2h ago', path: '/leads' },
    { type: 'Deal', title: 'Enterprise CRM Overhaul — $120,000', subtitle: 'Stage: Negotiation • Health: Healthy', path: '/pipeline' },
    { type: 'Account', title: 'Nordic AI Solutions', subtitle: '3 Contacts • $110,000 Opportunity', path: '/leads' },
  ];

  const handleSelect = (path: string) => {
    setCommandBarOpen(false);
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-fib-13">
      {/* Backdrop */}
      <div
        onClick={() => setCommandBarOpen(false)}
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in"
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl skeuo-raised-3 bg-white rounded-xl border border-neutral-200 overflow-hidden z-10 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Search input header */}
        <div className="p-fib-13 border-b border-neutral-200 flex items-center gap-fib-8 bg-neutral-50">
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command, lead name, deal, or account..."
            className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 outline-none"
          />
          <button
            onClick={() => setCommandBarOpen(false)}
            className="p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="max-h-80 overflow-y-auto p-fib-8 space-y-fib-13">
          {/* Quick Actions */}
          <div>
            <span className="px-fib-8 text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-fib-3">
              Quick Navigation
            </span>
            <div className="space-y-fib-2">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(action.path)}
                  className="w-full flex items-center justify-between p-fib-8 rounded-md hover:bg-blue-50 text-left text-xs font-medium text-neutral-800 hover:text-blue-900 group transition-colors"
                >
                  <div className="flex items-center gap-fib-8">
                    {action.icon}
                    <span>{action.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div>
            <span className="px-fib-8 text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-fib-3">
              CRM Records
            </span>
            <div className="space-y-fib-2">
              {sampleResults.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(item.path)}
                  className="w-full flex items-center justify-between p-fib-8 rounded-md hover:bg-neutral-100 text-left text-xs text-neutral-800 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-fib-5">
                      <span className="text-[10px] font-bold px-fib-5 py-0.2 rounded bg-neutral-200 text-neutral-700 uppercase">
                        {item.type}
                      </span>
                      <span className="font-semibold text-neutral-900">{item.title}</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{item.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">Jump ↵</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-fib-8 bg-neutral-100/80 border-t border-neutral-200 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Use ⌘K anytime to open</span>
          <span className="font-mono">ESC to close</span>
        </div>
      </div>
    </div>
  );
}
