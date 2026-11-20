'use client';

/**
 * Footer "Popups & Tools" dock — guarantees every popup design in the promo
 * family is reachable on demand (user request: nothing discarded, different
 * popup TYPES — new-movie promo, announcement, settings, system status).
 *
 * - "New Movie Promo" re-opens the homepage Tall Rich popup via a window
 *   event (bypasses session gating — user explicitly asked for it).
 * - Announcement / Quick Settings / System Status are mounted here and open
 *   on click. No session gating for manual opens.
 */

import { useState } from 'react';
import { Activity, Clapperboard, Megaphone, Settings } from 'lucide-react';
import AnnouncementPopup from '@/components/promo/AnnouncementPopup';
import QuickSettingsPopup from '@/components/promo/QuickSettingsPopup';
import SystemStatusPopup from '@/components/promo/SystemStatusPopup';

type DockPopup = 'announcement' | 'settings' | 'status' | null;

export default function PromoDock() {
  const [openPopup, setOpenPopup] = useState<DockPopup>(null);

  const openTallRich = () => {
    window.dispatchEvent(new CustomEvent('ts:promo:open', { detail: 'tallrich' }));
  };

  const buttons: Array<{ key: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; action: () => void }> = [
    { key: 'tallrich', label: 'New Movie Promo', icon: Clapperboard, action: openTallRich },
    { key: 'announcement', label: 'Announcement', icon: Megaphone, action: () => setOpenPopup('announcement') },
    { key: 'settings', label: 'Quick Settings', icon: Settings, action: () => setOpenPopup('settings') },
    { key: 'status', label: 'System Status', icon: Activity, action: () => setOpenPopup('status') },
  ];

  return (
    <>
      <div className="border-t border-white/[0.06] pt-8 mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-[#6b7280] mb-3">Popups & Tools</p>
        <div className="flex flex-wrap gap-3">
          {buttons.map(({ key, label, icon: Icon, action }) => (
            <button
              key={key}
              type="button"
              onClick={action}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0c0c10] border border-white/[0.06] text-sm text-[#9ca3af] hover:text-[#D4A853] hover:border-[#D4A853]/40 transition-colors"
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <AnnouncementPopup open={openPopup === 'announcement'} onClose={() => setOpenPopup(null)} />
      <QuickSettingsPopup open={openPopup === 'settings'} onClose={() => setOpenPopup(null)} />
      <SystemStatusPopup open={openPopup === 'status'} onClose={() => setOpenPopup(null)} />
    </>
  );
}
