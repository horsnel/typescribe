'use client';

/**
 * System Status popup — a system-down/health notification popup built on the
 * compact floating-card shell (deepseek_html_20261120_daf968.html family:
 * small gray card bottom-right, radius 16, small circular ✕).
 *
 * Statuses are REAL: on open it pings three live platform endpoints and
 * reports up/down + latency. Status colours are new by necessity (semantic
 * traffic-light colours: green operational, red down, amber checking).
 * Opened from the footer dock; no auto-show.
 */

import { useEffect, useState } from 'react';
import { Activity, X } from 'lucide-react';

type RowState = 'checking' | 'up' | 'down';

interface ServiceRow {
  key: string;
  label: string;
  endpoint: string;
  state: RowState;
  latency: number | null;
}

const SERVICES: Array<{ key: string; label: string; endpoint: string }> = [
  { key: 'catalog', label: 'Catalog API', endpoint: '/api/browse?source=trending&count=1' },
  { key: 'news', label: 'News feed', endpoint: '/api/news' },
  { key: 'geo', label: 'Geo service', endpoint: '/api/geo' },
];

const initialRows: ServiceRow[] = SERVICES.map((s) => ({ ...s, state: 'checking' as RowState, latency: null }));

export default function SystemStatusPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<ServiceRow[]>(initialRows);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset status rows when the popup opens
    setRows(initialRows);

    (async () => {
      for (const svc of SERVICES) {
        const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        let ok = false;
        try {
          const res = await fetch(svc.endpoint, { cache: 'no-store' });
          ok = res.ok;
        } catch {
          ok = false;
        }
        const latency = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
        if (!cancelled) {
          setRows((prev) => prev.map((r) => (r.key === svc.key ? { ...r, state: ok ? 'up' : 'down', latency } : r)));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const upCount = rows.filter((r) => r.state === 'up').length;
  const allDown = rows.every((r) => r.state === 'down');

  return (
    <div
      className="fixed z-[70]"
      style={{ bottom: 20, right: 20, width: 'min(85%, 320px)' }}
      role="status"
      aria-label="System status"
    >
      <div className="tss-card relative">
        <button type="button" className="tss-close" onClick={onClose} aria-label="Close system status"><X className="w-3 h-3" strokeWidth={2} /></button>

        <div className="flex items-center gap-2 mb-3 pr-7">
          <Activity className={`w-4 h-4 ${allDown ? 'text-[#ff453a]' : 'text-[#30d158]'}`} strokeWidth={1.5} />
          <h2 className="text-[15px] font-bold text-white">System Status</h2>
        </div>

        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 bg-black/25 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`tss-dot ${row.state === 'up' ? 'tss-dot-up' : row.state === 'down' ? 'tss-dot-down' : 'tss-dot-checking'}`}
                  aria-hidden="true"
                />
                <span className="text-[13px] text-white truncate">{row.label}</span>
              </div>
              <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: row.state === 'up' ? '#30d158' : row.state === 'down' ? '#ff453a' : '#E5B15B' }}>
                {row.state === 'up' ? `Operational · ${row.latency}ms` : row.state === 'down' ? 'Down' : 'Checking…'}
              </span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-[#999] mt-3 mb-0">
          {rows.some((r) => r.state === 'checking') ? 'Pinging live endpoints…' : `${upCount}/${rows.length} services operational · checked just now`}
        </p>
      </div>

      <style>{`
        .tss-card {
          background: #333338; border-radius: 16px; padding: 16px; color: white;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          animation: tss-slideUp 0.4s ease-out;
        }
        @keyframes tss-slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .tss-close {
          position: absolute; top: 12px; right: 12px; width: 24px; height: 24px;
          background: rgba(0,0,0,0.4); border: none; border-radius: 50%; color: #ccc;
          cursor: pointer; display: flex; justify-content: center; align-items: center;
        }
        .tss-close:hover { color: white; }
        .tss-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
        .tss-dot-up { background: #30d158; }
        .tss-dot-down { background: #ff453a; }
        .tss-dot-checking { background: #E5B15B; animation: tss-pulse 1s ease-in-out infinite; }
        @keyframes tss-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>
    </div>
  );
}
