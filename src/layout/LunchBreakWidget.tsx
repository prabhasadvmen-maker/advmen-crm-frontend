import { useEffect, useState, useRef } from 'react';
import { attendanceApi, AttendanceLunchBreak } from '@/features/admin/api/attendanceApi';
import { useUIStore } from '@/stores/uiStore';
import { Utensils, Clock, Check, Play, Pause, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export function LunchBreakWidget() {
  const [isOnLunch, setIsOnLunch] = useState(false);
  const [currentLunchStart, setCurrentLunchStart] = useState<string | null>(null);
  const [lunchBreaks, setLunchBreaks] = useState<AttendanceLunchBreak[]>([]);
  const [totalDurationFormatted, setTotalDurationFormatted] = useState('0m');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { addToast } = useUIStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchLunchStatus = async () => {
    try {
      const res = await attendanceApi.getLunchStatus();
      setIsOnLunch(Boolean(res.isOnLunch));
      setCurrentLunchStart(res.currentLunchStart || null);
      setLunchBreaks(res.lunchBreaks || []);
      setTotalDurationFormatted(res.lunchDurationFormatted || '0m');

      if (res.isOnLunch && res.currentLunchStart) {
        const startMs = new Date(res.currentLunchStart).getTime();
        if (!isNaN(startMs)) {
          setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
        }
      }
    } catch {
      // Non-critical, ignore silent error
    }
  };

  useEffect(() => {
    void fetchLunchStatus();
    const interval = setInterval(fetchLunchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Ticking timer while on lunch
  useEffect(() => {
    if (!isOnLunch || !currentLunchStart) {
      setElapsedSeconds(0);
      return;
    }

    const startMs = new Date(currentLunchStart).getTime();
    if (isNaN(startMs)) return;

    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    tick();

    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isOnLunch, currentLunchStart]);

  // Click outside listener for menu
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleStartLunch = async () => {
    try {
      setIsLoading(true);
      const res = await attendanceApi.startLunch();
      setIsOnLunch(true);
      const nowIso = new Date().toISOString();
      setCurrentLunchStart(nowIso);
      setElapsedSeconds(0);
      setMenuOpen(false);
      addToast({
        type: 'info',
        title: 'Lunch Break Started',
        message: 'Your lunch break has started. Enjoy your meal!',
      });
      await fetchLunchStatus();
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Could Not Start Lunch',
        message: err?.message || 'Server error while starting lunch break.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndLunch = async () => {
    try {
      setIsLoading(true);
      const res = await attendanceApi.endLunch();
      setIsOnLunch(false);
      setCurrentLunchStart(null);
      setMenuOpen(false);
      addToast({
        type: 'success',
        title: 'Welcome Back!',
        message: 'Lunch break completed and recorded in attendance history.',
      });
      await fetchLunchStatus();
    } catch (err: any) {
      addToast({
        type: 'danger',
        title: 'Could Not End Lunch',
        message: err?.message || 'Server error while ending lunch break.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="relative" ref={dropdownRef}>
      {isOnLunch ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-300 font-mono text-xs font-bold transition shadow-xs animate-pulse cursor-pointer"
            title="Click to view today's lunch details"
          >
            <Utensils className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>On Lunch ({timeFormatted})</span>
            <ChevronDown className="w-3 h-3 text-amber-500" />
          </button>

          <button
            type="button"
            onClick={handleEndLunch}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
            title="Finish lunch and resume work"
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">End Lunch</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 border border-neutral-200 text-xs font-semibold transition cursor-pointer"
            title="Lunch Break Tracker"
          >
            <Utensils className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Lunch</span>
            {lunchBreaks.length > 0 && (
              <span className="text-[10px] px-1 py-0.2 rounded bg-neutral-200 text-neutral-700 font-bold font-mono">
                {totalDurationFormatted}
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>
        </div>
      )}

      {menuOpen && (
        <div className="absolute right-0 mt-1.5 w-72 rounded-xl bg-white border border-neutral-200 p-3 shadow-xl z-50 text-xs space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-neutral-900">
              <Utensils className="w-4 h-4 text-amber-600" />
              <span>Today's Lunch Break Tracker</span>
            </div>
            {isOnLunch && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                Active
              </span>
            )}
          </div>

          <div className="rounded-lg bg-neutral-50 p-2.5 space-y-1.5 border border-neutral-100 text-xs">
            <div className="flex items-center justify-between text-neutral-600">
              <span>Lunch Schedule:</span>
              <span className="font-semibold text-neutral-900">01:00 PM (20m limit)</span>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <span>Total Lunch Today:</span>
              <span className="font-mono font-bold text-neutral-900">{totalDurationFormatted}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <span>Breaks Taken:</span>
              <span className="font-mono font-bold text-neutral-900">{lunchBreaks.length}</span>
            </div>
            {isOnLunch && (
              <div className={`flex items-center justify-between pt-1.5 border-t border-neutral-200/60 font-semibold ${
                elapsedSeconds > 1200 ? 'text-rose-700' : 'text-amber-800'
              }`}>
                <span>Time Elapsed:</span>
                <span className="font-mono font-black text-sm">
                  {timeFormatted} / 20:00
                  {elapsedSeconds > 1200 && (
                    <span className="ml-1 text-[10px] text-rose-600 font-bold block text-right">
                      (+{Math.floor((elapsedSeconds - 1200) / 60)}m {Math.floor((elapsedSeconds - 1200) % 60)}s late)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Past breaks today */}
          {lunchBreaks.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Today's Breaks
              </div>
              {lunchBreaks.map((b, idx) => {
                const sTime = b.startTime
                  ? new Date(b.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                  : '';
                const eTime = b.endTime
                  ? new Date(b.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                  : 'Ongoing';
                return (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-neutral-100 text-[11px]">
                    <span className="text-neutral-600 font-mono">{sTime} - {eTime}</span>
                    <span className="font-semibold text-neutral-800">{b.durationFormatted || 'Active'}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action button */}
          <div>
            {isOnLunch ? (
              <button
                type="button"
                onClick={handleEndLunch}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Finish Lunch & Return to Work</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartLunch}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Lunch Break Now</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
