'use client';

/**
 * Quick Settings popup — a settings-type popup built on the Tall Rich Media
 * card shell (deepseek_html_20261120_b9bed3.html chrome: #1c1c1e, radius 20,
 * ring shadow, slideUpFade, glass ✕) with functional rows instead of promo
 * content.
 *
 * REAL settings, wired to existing app state:
 *  - Promo popups master switch (localStorage ts_promo_disabled, honoured by
 *    promoGate — turns every auto promo off but keeps manual dock opens)
 *  - Country override for Local Picks (lib/geolocation set/clearCountryOverride)
 *  - Link to the full /settings page.
 * Opened from the footer dock; no auto-show.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe, Settings, X } from 'lucide-react';
import { AVAILABLE_COUNTRIES, COUNTRY_NAMES, clearCountryOverride, getCurrentLocation, setCountryOverride } from '@/lib/geolocation';

export default function QuickSettingsPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [promosEnabled, setPromosEnabled] = useState(true);
  const [country, setCountry] = useState('auto');

  // Read current settings each time the popup opens.
  useEffect(() => {
    if (!open) return;
    try {
      setPromosEnabled(localStorage.getItem('ts_promo_disabled') !== '1');
      const loc = getCurrentLocation();
      const stored = localStorage.getItem('typescribe_country_override');
      setCountry(stored ? (JSON.parse(stored)?.countryCode || 'auto') : loc?.countryCode || 'auto');
    } catch {
      /* ignore */
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const togglePromos = () => {
    const next = !promosEnabled;
    setPromosEnabled(next);
    try {
      if (next) localStorage.removeItem('ts_promo_disabled');
      else localStorage.setItem('ts_promo_disabled', '1');
    } catch {
      /* ignore */
    }
  };

  const changeCountry = (code: string) => {
    setCountry(code);
    try {
      if (code === 'auto') clearCountryOverride();
      else setCountryOverride(code, COUNTRY_NAMES[code] || code);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]" onClick={onClose} role="presentation">
      <div
        className="tsq-card relative w-full"
        style={{ maxWidth: 380 }}
        role="dialog"
        aria-modal="true"
        aria-label="Quick settings"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="tsq-close" onClick={onClose} aria-label="Close quick settings"><X className="w-4 h-4" strokeWidth={2} /></button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-[10px] bg-[#D4A853]/10 border border-white/[0.06] flex items-center justify-center">
            <Settings className="w-4.5 h-4.5 text-[#D4A853]" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-extrabold text-white">Quick Settings</h2>
        </div>

        {/* Promo popups master switch */}
        <div className="flex items-center justify-between gap-4 py-3 border-t border-white/[0.06]">
          <div className="min-w-0">
            <div className="text-sm font-bold text-white">Promo popups</div>
            <div className="text-[11px] text-[#888] leading-[1.3] mt-0.5">Trending cards & toasts around the app. You can still open them from the footer dock.</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={promosEnabled}
            onClick={togglePromos}
            className={`tsq-switch flex-shrink-0 ${promosEnabled ? 'tsq-switch-on' : ''}`}
          >
            <span className="tsq-knob" />
          </button>
        </div>

        {/* Country override — real Local Picks setting */}
        <div className="flex items-center justify-between gap-4 py-3 border-t border-b border-white/[0.06]">
          <div className="min-w-0">
            <div className="text-sm font-bold text-white flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-[#D4A853]" strokeWidth={1.5} /> Local Picks country</div>
            <div className="text-[11px] text-[#888] leading-[1.3] mt-0.5">Movies picked for your region on the homepage.</div>
          </div>
          <select
            value={country}
            onChange={(e) => changeCountry(e.target.value)}
            aria-label="Local Picks country"
            className="flex-shrink-0 bg-[#0c0c10] border border-white/[0.1] rounded-lg text-white text-xs px-2 py-2 focus:outline-none focus:border-[#D4A853] max-w-[130px]"
          >
            <option value="auto">Auto-detect</option>
            {AVAILABLE_COUNTRIES.map((code) => (
              <option key={code} value={code}>{COUNTRY_NAMES[code] || code}</option>
            ))}
          </select>
        </div>

        <Link href="/settings" className="tsq-full-link">Open full settings →</Link>
      </div>

      <style>{`
        .tsq-card {
          background: #1c1c1e; border-radius: 20px; padding: 24px 20px 20px; color: white;
          box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
          animation: tsq-slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes tsq-slideUpFade {
          from { transform: translateY(40px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .tsq-close {
          position: absolute; top: 16px; right: 16px; width: 32px; height: 32px;
          background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 50%;
          color: white; cursor: pointer; display: flex; justify-content: center; align-items: center;
        }
        .tsq-switch {
          width: 44px; height: 24px; border-radius: 12px; background: rgba(255,255,255,0.15);
          border: none; position: relative; cursor: pointer; transition: background 0.2s;
        }
        .tsq-switch-on { background: #D4A853; }
        .tsq-knob {
          position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%;
          background: white; transition: transform 0.2s; display: block;
        }
        .tsq-switch-on .tsq-knob { transform: translateX(20px); }
        .tsq-full-link {
          display: inline-block; margin-top: 14px; color: #D4A853; font-size: 13px; font-weight: 600;
        }
        .tsq-full-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
