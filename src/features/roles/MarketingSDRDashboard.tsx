import { KPICard } from '@/components/patterns/KPICard';
import { WidgetBoundary } from '@/components/system/WidgetBoundary';
import { Button } from '@/components/ui/Button';
import { useLeads } from '../leads/hooks/useLeads';
import {
  Users,
  Flame,
  Globe,
  Share2,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function MarketingSDRDashboard() {
  const navigate = useNavigate();
  const { leads } = useLeads();

  const hotLeads = leads.filter((l) => l.scoreCategory === 'HOT' || l.score >= 80);
  const hotRate = leads.length ? Math.round((hotLeads.length / leads.length) * 100) : 0;

  return (
    <div className="space-y-fib-21">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-fib-13 pb-fib-8 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-fib-8 mb-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
              Marketing & Inbound SDR Lead Center
            </h1>
            <span className="text-[10px] font-bold px-fib-8 py-0.5 rounded-pill bg-indigo-100 text-indigo-800 border border-indigo-300 font-mono">
              Inbound Capture
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Multi-channel campaign attribution, autonomous lead scoring triage, and real-time SDR routing.
          </p>
        </div>

        <div className="flex items-center gap-fib-8">
          <Button
            size="sm"
            variant="secondary"
            icon={<Filter className="w-3.5 h-3.5" />}
            onClick={() => navigate('/leads')}
          >
            Filter Leads
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<Users className="w-3.5 h-3.5" />}
            onClick={() => navigate('/inbox')}
          >
            Open Inbound Inbox
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-fib-13">
        <WidgetBoundary name="kpi-inbound-volume">
          <KPICard
            label="Total Inbound Leads"
            value={leads.length}
            subtext="Tracked across channels"
            accent="blue"
            icon={<Globe className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-hot-lead-rate">
          <KPICard
            label="AI Qualified Hot Leads"
            value={`${hotLeads.length} (${hotRate}%)`}
            subtext="Score >= 80"
            accent="rose"
            icon={<Flame className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-sdr-touch-speed">
          <KPICard
            label="Qualified Leads"
            value={leads.filter((l) => l.status === 'QUALIFIED').length}
            subtext="Ready for AE outreach"
            accent="green"
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </WidgetBoundary>

        <WidgetBoundary name="kpi-campaign-cvr">
          <KPICard
            label="Contacted Leads"
            value={leads.filter((l) => l.status === 'CONTACTED').length}
            subtext="In active conversation"
            accent="blue"
            icon={<Share2 className="w-4 h-4" />}
          />
        </WidgetBoundary>
      </div>

      {/* Attribution Channels Breakdown */}
      <div className="skeuo-raised-2 bg-white rounded-md border border-neutral-200 p-fib-21 space-y-fib-13">
        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
          Inbound Lead Hub Overview
        </h3>

        {leads.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            No inbound leads recorded yet. Prospects captured via website, LinkedIn, email, and API will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-fib-13 text-xs">
            <div className="p-fib-13 rounded-lg bg-blue-50/60 border border-blue-200 space-y-fib-5">
              <span className="font-bold text-blue-900 block">Website Inbound</span>
              <p className="text-[11px] text-neutral-600">
                {leads.filter((l) => l.source === 'WEBSITE').length} Leads Captured
              </p>
            </div>

            <div className="p-fib-13 rounded-lg bg-indigo-50/60 border border-indigo-200 space-y-fib-5">
              <span className="font-bold text-indigo-900 block">Social & Campaign</span>
              <p className="text-[11px] text-neutral-600">
                {leads.filter((l) => l.source === 'LINKEDIN' || l.source === 'META_ADS').length} Leads Captured
              </p>
            </div>

            <div className="p-fib-13 rounded-lg bg-neutral-100/70 border border-neutral-200 space-y-fib-5">
              <span className="font-bold text-neutral-900 block">Direct & Referral</span>
              <p className="text-[11px] text-neutral-600">
                {leads.filter((l) => l.source === 'REFERRAL' || l.source === 'INBOUND_CALL').length} Leads Captured
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
