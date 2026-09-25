'use client';

import { useEffect, useState } from 'react';
import { Download, X, Share, MoreVertical, MonitorSmartphone } from 'lucide-react';

/**
 * In-app install prompt.
 *
 * Chrome on Android does NOT show an address-bar install icon (desktop only):
 * it fires `beforeinstallprompt` (usually only once the service worker is
 * active, i.e. from the second visit on) or hides the action in the ⋮ menu.
 * This component captures that event early (even before hydration, via the
 * inline capture script in layout.tsx) and renders an explicit Install pill
 * so the entry point never depends on browser UI the user may never see.
 *
 * iOS has no install prompt at all — we show the Share → Add to Home Screen
 * steps instead. Android without the event gets the ⋮ menu fallback hint.
 */

const DISMISS_KEY = 'ts_install_dismissed';
const DISMISS_DAYS = 14;

type Mode = 'available' | 'ios' | 'manual' | null;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    // iOS Safari marks standalone via navigator.standalone
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ masquerades as Mac — check for touch support too
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isAndroidish(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|Mobile/.test(navigator.userAgent);
}

function recentlyDismissed(): boolean {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY));
    if (!ts) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const [mode, setMode] = useState<Mode>(null);
  const [promptEvent, setPromptEvent] = useState<any>(null);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    // 1) Event may already have been captured by the inline head script
    //    (it can fire before React hydrates).
    const early = (window as any).__tsInstall;
    if (early) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with externally captured install event on mount
      setPromptEvent(early);
      setMode('available');
      return;
    }

    if (isIOS()) {
      setMode('ios');
      return;
    }

    const onCaptured = () => {
      const ev = (window as any).__tsInstall;
      if (ev) {
        setPromptEvent(ev);
        setMode('available');
      }
    };
    window.addEventListener('ts-install-ready', onCaptured);
    window.addEventListener('beforeinstallprompt', onCaptured);

    // 2) Fallback: Android but Chrome never fires the event (e.g. the
    //    mini-infobar was previously dismissed). Offer the menu path.
    const manualTimer = isAndroidish()
      ? window.setTimeout(() => {
          setMode((m) => (m === null && !isStandalone() ? 'manual' : m));
        }, 4000)
      : null;

    const onInstalled = () => {
      setMode(null);
      setPromptEvent(null);
      try { localStorage.removeItem(DISMISS_KEY); } catch { /* ignore */ }
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('ts-install-ready', onCaptured);
      window.removeEventListener('beforeinstallprompt', onCaptured);
      window.removeEventListener('appinstalled', onInstalled);
      if (manualTimer) window.clearTimeout(manualTimer);
    };
  }, []);

  if (!mode) return null;

  const dismiss = () => {
    setMode(null);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
  };

  const install = async () => {
    if (!promptEvent) return;
    try {
      promptEvent.prompt();
      await promptEvent.userChoice;
    } catch { /* user closed the native dialog — ignore */ }
    setPromptEvent(null);
    setMode(null);
  };

  return (
    <div
      role="dialog"
      aria-label="Install Typescribe app"
      className="fixed bottom-4 right-4 z-[55] max-w-[calc(100vw-2rem)] sm:bottom-6 sm:right-6"
    >
      <div className="flex items-start gap-3 rounded-xl border border-[#D4A853]/30 bg-[#0c0c10]/95 p-3.5 pr-2.5 shadow-2xl shadow-black/60 backdrop-blur-sm">
        <div className="hidden sm:flex w-9 h-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#D4A853] to-[#B8922F]">
          <MonitorSmartphone className="h-4 w-4 text-[#050507]" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">Install Typescribe</p>
          {mode === 'available' && (
            <>
              <p className="mt-0.5 text-xs text-[#9ca3af]">Full-screen app, works offline.</p>
              <button
                onClick={install}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#D4A853] px-3 py-1.5 text-xs font-bold text-[#050507] hover:bg-[#E8C97A] transition-colors"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={2} />
                Install app
              </button>
            </>
          )}
          {mode === 'ios' && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-[#9ca3af]">
              Tap <Share className="inline h-3.5 w-3.5 text-[#D4A853]" strokeWidth={1.8} /> Share
              <span className="mx-0.5">→</span> Add to Home Screen
            </p>
          )}
          {mode === 'manual' && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-[#9ca3af]">
              Browser menu <MoreVertical className="inline h-3.5 w-3.5 text-[#D4A853]" strokeWidth={1.8} />
              <span className="mx-0.5">→</span> Add to Home screen
            </p>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="ml-1 rounded-full p-1 text-[#6b7280] hover:text-white transition-colors"
        >
          <X className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
