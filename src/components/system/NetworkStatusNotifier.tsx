import { useState, useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { WifiOff, Wifi, RefreshCw, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ToastContainer } from '@/components/ui/ToastContainer';

interface NetworkAlertData {
  message: string;
  details?: string;
  isOffline?: boolean;
}

export function NetworkStatusNotifier() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showRestored, setShowRestored] = useState<boolean>(false);
  const [networkAlert, setNetworkAlert] = useState<NetworkAlertData | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retryResult, setRetryResult] = useState<'success' | 'failed' | null>(null);

  const { addToast } = useUIStore();

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setRetryResult(null);

    try {
      // Check both navigator status and backend liveness endpoint
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Device is offline');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch('/api/v1/health/live', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      }).catch(async () => {
        // Fallback check to unversioned health endpoint
        return fetch('/health/live', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);

      if (response && response.ok) {
        setIsOnline(true);
        setRetryResult('success');
        addToast({
          type: 'success',
          title: 'Connected (सर्वर से कनेक्शन जुड़ गया)',
          message: 'Backend server and internet are working properly.',
          durationMs: 4000,
        });

        setTimeout(() => {
          setNetworkAlert(null);
          setRetryResult(null);
        }, 2200);
      } else {
        throw new Error(`Server returned HTTP ${response?.status || 'Error'}`);
      }
    } catch {
      setRetryResult('failed');
      setTimeout(() => {
        setRetryResult(null);
      }, 3500);
    } finally {
      setIsRetrying(false);
    }
  }, [addToast]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      setNetworkAlert(null);
      addToast({
        type: 'success',
        title: 'Internet Restored (इंटरनेट चालू हो गया)',
        message: 'Internet connection wapas jud gaya hai.',
        durationMs: 4000,
      });

      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
      setNetworkAlert({
        message: 'Aap offline hain. Kripya apna Wi-Fi ya mobile data connection check karein.',
        details: 'Device Offline',
        isOffline: true,
      });
      addToast({
        type: 'danger',
        title: 'Network Disconnected (इंटरनेट बंद है)',
        message: 'Aap offline hain. Kripya apna Wi-Fi ya mobile data connection check karein.',
        durationMs: 6000,
      });
    };

    const handleCustomNetworkIssue = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      setNetworkAlert({
        message: detail.message || 'Server ya internet se connection toot gaya hai.',
        details: detail.details || 'Connection Error',
        isOffline: detail.isOffline ?? !navigator.onLine,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('app:network-issue', handleCustomNetworkIssue);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('app:network-issue', handleCustomNetworkIssue);
    };
  }, [addToast]);

  return (
    <>
      {/* Global Toast Container: renders on all screens (Login, Admin, Dashboard) */}
      <ToastContainer />

      {/* Persistent Slim Top Banner if completely Offline */}
      {!isOnline && (
        <aside
          role="alert"
          aria-live="assertive"
          className="fixed top-0 left-0 right-0 z-[99998] bg-gradient-to-r from-rose-700 via-red-600 to-rose-800 text-white text-xs font-semibold py-2 px-4 shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300"
        >
          <div className="flex items-center gap-2.5 max-w-7xl mx-auto w-full">
            <WifiOff className="w-4 h-4 animate-pulse shrink-0 text-white" />
            <span className="font-bold tracking-tight">
              Network Offline (इंटरनेट बंद है):
            </span>
            <span className="opacity-95 text-[11px] sm:text-xs">
              Aapka device offline hai. Data sync karne ke liye internet connection check karein.
            </span>
          </div>
        </aside>
      )}

      {/* Temporary Internet Restored Banner */}
      {showRestored && isOnline && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-[99998] bg-emerald-600 text-white text-xs font-semibold py-2 px-4 shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300"
        >
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <Wifi className="w-4 h-4 shrink-0 text-white" />
            <span className="font-bold">
              Back Online (इंटरनेट चालू हो गया):
            </span>
            <span className="opacity-95 text-[11px] sm:text-xs">
              Internet connection successfully re-established.
            </span>
          </div>
        </aside>
      )}

      {/* Dedicated Floating Network Issue Notification Card */}
      {networkAlert && (
        <div
          role="dialog"
          aria-label="Network Connection Issue"
          className="fixed bottom-5 right-5 z-[99999] max-w-sm w-[calc(100vw-2.5rem)] animate-in slide-in-from-bottom-4 duration-300"
        >
          <div className="bg-neutral-900/95 backdrop-blur-md text-white border-2 border-rose-500/80 rounded-xl p-4 shadow-2xl flex flex-col gap-3 relative overflow-hidden">
            {/* Ambient glow accent */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-rose-600/20 rounded-full blur-2xl pointer-events-none" />

            {/* Header with status pulse & close button */}
            <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                </span>
                <span className="font-bold text-xs uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  Network Issue (नेटवर्क समस्या)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setNetworkAlert(null)}
                aria-label="Dismiss notification"
                className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification Body */}
            <div className="space-y-1.5 text-xs">
              <p className="font-medium text-neutral-100 leading-snug">
                {networkAlert.message}
              </p>
              {networkAlert.details && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-800/80 border border-neutral-700/60 text-[10px] text-neutral-300 font-mono">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{networkAlert.details}</span>
                </div>
              )}
            </div>

            {/* Retry Result Feedback */}
            {retryResult === 'success' && (
              <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1.5 rounded-lg animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Connection safal! Server jud gaya hai.</span>
              </div>
            )}
            {retryResult === 'failed' && (
              <div className="flex items-center gap-1.5 text-rose-300 text-[11px] font-medium bg-rose-950/60 border border-rose-500/40 px-2.5 py-1.5 rounded-lg animate-in fade-in">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>Abhi bhi connect nahi ho pa raha hai. Thoda ruk kar check karein.</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isRetrying}
                onClick={handleRetry}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'Checking...' : 'Retry Connection (चेक करें)'}</span>
              </button>
              <button
                type="button"
                onClick={() => setNetworkAlert(null)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default NetworkStatusNotifier;
