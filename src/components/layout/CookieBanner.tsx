'use client';

import { useState, useEffect } from 'react';
import { Cookie, X, Shield, BarChart3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ConsentState = 'undecided' | 'accepted' | 'rejected' | 'customized';
interface CookiePreferences { essential: boolean; analytics: boolean; preferences: boolean; }
const STORAGE_KEY = 'cookie-consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({ essential: true, analytics: false, preferences: false });
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        const timer = setTimeout(() => {
          setVisible(true);
          requestAnimationFrame(() => { requestAnimationFrame(() => { setAnimateIn(true); }); });
        }, 1500);
        return () => clearTimeout(timer);
      }
    } catch { /* ignore */ }
  }, []);

  const saveConsent = (state: ConsentState, preferences: CookiePreferences) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, preferences, timestamp: Date.now() }));
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 300);
  };

  const handleAccept = () => saveConsent('accepted', { essential: true, analytics: true, preferences: true });
  const handleReject = () => saveConsent('rejected', { essential: true, analytics: false, preferences: false });
  const handleCustomize = () => { saveConsent('customized', prefs); setShowCustomize(false); };

  if (!visible) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 p-4 transition-all duration-300 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
      <div className="max-w-4xl mx-auto bg-[#0c0c10] border border-[#1e1e28] rounded-2xl shadow-2xl overflow-hidden">
        {!showCustomize ? (
          <div className="p-6">
            <div className="flex items-start gap-4">
              <Cookie className="w-8 h-8 text-[#e50914] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white mb-2">We use cookies</h3>
                <p className="text-sm text-[#9ca3af] leading-relaxed mb-4">
                  We use cookies to improve your experience and deliver personalized content. By clicking &ldquo;Accept All&rdquo;, you consent to our use of cookies.{' '}
                  <a href="/cookies" className="text-[#e50914] hover:underline">Learn more</a>
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Button onClick={handleAccept} className="bg-[#e50914] hover:bg-[#b20710] text-white text-sm font-medium">Accept All</Button>
                  <Button onClick={() => setShowCustomize(true)} variant="outline" className="border-[#1e1e28] bg-transparent text-[#9ca3af] hover:text-white hover:bg-[#111118] text-sm">Customize</Button>
                  <Button onClick={handleReject} variant="ghost" className="text-[#6b7280] hover:text-white text-sm">Reject Non-Essential</Button>
                </div>
              </div>
              <button onClick={handleReject} className="p-1 text-[#6b7280] hover:text-white transition-colors flex-shrink-0" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <h3 className="text-base font-semibold text-white mb-4">Customize Cookie Preferences</h3>
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-4 p-3 bg-[#050507] rounded-xl border border-[#1e1e28]">
                <Shield className="w-5 h-5 text-[#22c55e] flex-shrink-0" />
                <div className="flex-1"><p className="text-sm font-medium text-white">Essential Cookies</p><p className="text-xs text-[#6b7280]">Required for the site to function. Cannot be disabled.</p></div>
                <span className="text-xs text-[#22c55e] font-medium">Always Active</span>
              </div>
              <label className="flex items-center gap-4 p-3 bg-[#050507] rounded-xl border border-[#1e1e28] cursor-pointer">
                <BarChart3 className="w-5 h-5 text-[#9ca3af] flex-shrink-0" />
                <div className="flex-1"><p className="text-sm font-medium text-white">Analytics Cookies</p><p className="text-xs text-[#6b7280]">Help us understand how visitors interact with our site.</p></div>
                <input type="checkbox" checked={prefs.analytics} onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })} className="w-5 h-5 rounded accent-[#e50914]" />
              </label>
              <label className="flex items-center gap-4 p-3 bg-[#050507] rounded-xl border border-[#1e1e28] cursor-pointer">
                <Settings className="w-5 h-5 text-[#9ca3af] flex-shrink-0" />
                <div className="flex-1"><p className="text-sm font-medium text-white">Preference Cookies</p><p className="text-xs text-[#6b7280]">Remember your settings and personalization choices.</p></div>
                <input type="checkbox" checked={prefs.preferences} onChange={(e) => setPrefs({ ...prefs, preferences: e.target.checked })} className="w-5 h-5 rounded accent-[#e50914]" />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleCustomize} className="bg-[#e50914] hover:bg-[#b20710] text-white text-sm font-medium">Save Preferences</Button>
              <Button onClick={handleAccept} variant="outline" className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#111118] text-sm">Accept All</Button>
              <button onClick={() => setShowCustomize(false)} className="text-sm text-[#6b7280] hover:text-white ml-2">Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
