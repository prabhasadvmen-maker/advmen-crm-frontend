import { FormEvent, useEffect, useState } from 'react';
import { Building2, Clock3, Coins, Headphones, RefreshCw, Save, Settings2, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/stores/uiStore';
import { useSessionStore } from '@/stores/sessionStore';
import { organizationsApi, TenantOrgDto } from './api/organizationsApi';

const DEFAULT_SETTINGS = {
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  leadResponseSlaMinutes: 15,
  allowTelephonyRecording: true,
};

export function SettingsPage() {
  const { user, switchOrganization } = useSessionStore();
  const { addToast } = useUIStore();
  const [organization, setOrganization] = useState<TenantOrgDto | null>(null);
  const [name, setName] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        if (!user.organizationId) throw new Error('No workspace is selected for this account.');
        const data = await organizationsApi.getOrganizationById(user.organizationId);
        if (cancelled) return;
        setOrganization(data);
        setName(data.name || user.organizationName || '');
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Workspace settings could not be loaded.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void loadSettings();
    return () => { cancelled = true; };
  }, [user.organizationId, user.organizationName]);

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault();
    if (!organization) return;
    setIsSaving(true);
    try {
      const updated = await organizationsApi.updateOrganizationSettings(organization.organizationId, {
        name: name.trim(),
        settings,
      });
      setOrganization(updated);
      switchOrganization(updated.organizationId, updated.name);
      addToast({
        type: 'success',
        title: 'Settings saved',
        message: 'Workspace details and operating settings have been updated.',
      });
    } catch (error) {
      addToast({
        type: 'danger',
        title: 'Could not save settings',
        message: error instanceof Error ? error.message : 'Workspace settings were not saved.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-start gap-3 border-b border-neutral-200 pb-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Settings2 className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Workspace Settings</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage organization details and defaults used across your CRM workspace.</p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white p-12 text-sm text-neutral-500">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading settings from database…
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <p className="font-semibold">Settings unavailable</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : organization && (
        <form onSubmit={saveSettings} className="space-y-5">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Building2 className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-neutral-900">Organization details</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-semibold text-neutral-700">
                Workspace name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <div className="space-y-1.5 text-xs font-semibold text-neutral-700">
                Workspace ID
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 font-mono text-sm text-neutral-600">
                  {organization.organizationId}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2 border-b border-neutral-100 pb-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-neutral-900">Operating defaults</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-semibold text-neutral-700">
                <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-neutral-400" /> Time zone</span>
                <select
                  value={settings.timezone}
                  onChange={(event) => setSettings((current) => ({ ...current, timezone: event.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm font-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Asia/Kolkata">India Standard Time (Asia/Kolkata)</option>
                  <option value="UTC">Coordinated Universal Time (UTC)</option>
                  <option value="America/New_York">Eastern Time (America/New_York)</option>
                  <option value="Europe/London">United Kingdom (Europe/London)</option>
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-neutral-700">
                <span className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-neutral-400" /> Workspace currency</span>
                <select
                  value={settings.currency}
                  onChange={(event) => setSettings((current) => ({ ...current, currency: event.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm font-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="INR">INR — Indian Rupee (₹)</option>
                  <option value="USD">USD — US Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="GBP">GBP — Pound Sterling (£)</option>
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-neutral-700">
                Lead response SLA (minutes)
                <input
                  type="number"
                  min={1}
                  max={10080}
                  step={1}
                  required
                  value={settings.leadResponseSlaMinutes}
                  onChange={(event) => setSettings((current) => ({
                    ...current,
                    leadResponseSlaMinutes: Number(event.target.value),
                  }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-normal text-neutral-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs">
                <input
                  type="checkbox"
                  checked={settings.allowTelephonyRecording}
                  onChange={(event) => setSettings((current) => ({
                    ...current,
                    allowTelephonyRecording: event.target.checked,
                  }))}
                  className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-2 font-semibold text-neutral-800">
                  <Headphones className="h-4 w-4 text-neutral-500" /> Allow call recording
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-500" />
              <h2 className="text-sm font-bold text-neutral-800">Plan limits</h2>
              <span className="text-[10px] font-semibold uppercase text-neutral-400">Read only</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div><span className="block text-neutral-500">Active users</span><strong className="mt-1 block text-neutral-900">{organization.activeUsers} / {organization.limits?.maxUsers ?? organization.maxUsers}</strong></div>
              <div><span className="block text-neutral-500">Max leads</span><strong className="mt-1 block text-neutral-900">{organization.limits?.maxLeads?.toLocaleString('en-IN') ?? '—'}</strong></div>
              <div><span className="block text-neutral-500">Storage</span><strong className="mt-1 block text-neutral-900">{organization.storageGb} GB</strong></div>
              <div><span className="block text-neutral-500">Plan status</span><strong className="mt-1 block text-neutral-900">{organization.planStatus || '—'}</strong></div>
            </div>
          </section>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" isLoading={isSaving} icon={<Save className="h-4 w-4" />}>
              Save workspace settings
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
