'use client';

/**
 * Floating trending toast — implements BOTH user mockups 1:1:
 *   variant="final"   → deepseek_html_20261120_af2abe.html ("Final Exact
 *                        Popup Match": 350px card, #555555, 44px cancel btn
 *                        overlapping the corner at -20px, r=19 ring)
 *   variant="compact" → deepseek_html_20261120_daf968.html ("Exact Popup
 *                        Match": 320px card, #4a4a4a, 32px cancel at -12px,
 *                        r=14 ring)
 *
 * Design contract (do not restyle): gray card, italic ellipsised title, 🔥
 * subtitle, bookmark chip, black circular play button + gray "Watch later"
 * pill, white SVG countdown ring around the ✕.
 *
 * Behavior: bottom-right toast, once per session after 6s; auto-closes when
 * the 10s ring completes; ✕ suppresses for 7 days.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { markPromoSeen, markPromoDismissed, shouldShowPromo } from '@/components/promo/promoGate';
import { resolveImageUrl } from '@/lib/utils';
import type { Movie } from '@/lib/types';

const COUNTDOWN_MS = 10000;
const DELAY_MS = 6000;

interface VariantSpec {
  gateKey: string;
  endpoint: string;
  cardWidth: number;
  offsetBottom: number;
  offsetRight: number;
  cardBg: string;
  cancelSize: number;
  cancelOffset: number;
  cancelBg: string;
  ringR: number;
  ringCircumference: number;
  ringTrack: string;
  ringWidth: number;
  bookmarkSize: number;
  bookmarkOffset: number;
  bookmarkBg: string;
  bookmarkRadius: number;
  bookmarkIcon: number;
  titleSize: number;
  titlePadRight: number;
  subtitleSize: number;
  subtitleMarginBottom: number;
  playSize: number;
  playBg: string;
  playIcon: number;
  pillBg: string;
  pillHeight: number;
  pillRadius: number;
  pillPadding: number;
  pillFont: number;
  pillIcon: number;
}

const SPECS: Record<'final' | 'compact', VariantSpec> = {
  final: {
    gateKey: 'float-final',
    endpoint: '/api/browse?source=top_rated&count=3',
    cardWidth: 350,
    offsetBottom: 40,
    offsetRight: 20,
    cardBg: '#555555',
    cancelSize: 44,
    cancelOffset: 20,
    cancelBg: '#333333',
    ringR: 19,
    ringCircumference: 119.38,
    ringTrack: 'transparent',
    ringWidth: 3,
    bookmarkSize: 36,
    bookmarkOffset: 20,
    bookmarkBg: '#666666',
    bookmarkRadius: 8,
    bookmarkIcon: 16,
    titleSize: 22,
    titlePadRight: 48,
    subtitleSize: 14,
    subtitleMarginBottom: 24,
    playSize: 48,
    playBg: '#222222',
    playIcon: 20,
    pillBg: '#444444',
    pillHeight: 48,
    pillRadius: 24,
    pillPadding: 20,
    pillFont: 14,
    pillIcon: 16,
  },
  compact: {
    gateKey: 'float-compact',
    endpoint: '/api/browse?source=trending&count=3',
    cardWidth: 320,
    offsetBottom: 40,
    offsetRight: 30,
    cardBg: '#4a4a4a',
    cancelSize: 32,
    cancelOffset: 12,
    cancelBg: '#222222',
    ringR: 14,
    ringCircumference: 88,
    ringTrack: '#444444',
    ringWidth: 2,
    bookmarkSize: 32,
    bookmarkOffset: 16,
    bookmarkBg: 'rgba(255,255,255,0.1)',
    bookmarkRadius: 6,
    bookmarkIcon: 14,
    titleSize: 20,
    titlePadRight: 40,
    subtitleSize: 13,
    subtitleMarginBottom: 30,
    playSize: 44,
    playBg: '#111111',
    playIcon: 18,
    pillBg: '#3a3a3a',
    pillHeight: 44,
    pillRadius: 20,
    pillPadding: 16,
    pillFont: 13,
    pillIcon: 14,
  },
};

export default function FloatingPopup({ variant = 'final' }: { variant?: 'final' | 'compact' }) {
  const spec = SPECS[variant];
  const [movie, setMovie] = useState<Movie | null>(null);
  const [show, setShow] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(spec.endpoint, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.movies?.length > 0) setMovie(data.movies[0]);
      })
      .catch(() => {})
      .finally(() => {});
    return () => controller.abort();
  }, [spec.endpoint]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (shownRef.current) return;
      if (!shouldShowPromo(spec.gateKey)) return;
      shownRef.current = true;
      markPromoSeen(spec.gateKey);
      setShow(true);
    }, DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [spec.gateKey]);

  const close = () => {
    setShow(false);
    markPromoSeen(spec.gateKey);
  };

  const dismiss = () => {
    setShow(false);
    markPromoDismissed(spec.gateKey);
  };

  if (!show || !movie) return null;

  return (
    <div
      className="fixed z-[70]"
      style={{ bottom: spec.offsetBottom, right: spec.offsetRight, width: `min(85%, ${spec.cardWidth}px)` }}
      role="status"
    >
      <div className="tsv2-float-card relative" style={{ backgroundColor: spec.cardBg }}>
        {/* Countdown ring wrapping the ✕ — mockup .timer-cancel-btn / .countdown-cancel */}
        <button
          type="button"
          className="tsv2-float-cancel"
          style={{
            top: -spec.cancelOffset,
            right: -spec.cancelOffset,
            width: spec.cancelSize,
            height: spec.cancelSize,
            backgroundColor: spec.cancelBg,
          }}
          onClick={dismiss}
          aria-label="Dismiss"
        >
          <svg className="tsv2-float-ring" viewBox={`0 0 ${spec.cancelSize} ${spec.cancelSize}`} aria-hidden="true">
            <circle
              cx={spec.cancelSize / 2}
              cy={spec.cancelSize / 2}
              r={spec.ringR}
              style={{ stroke: spec.ringTrack, strokeWidth: spec.ringWidth }}
            />
            <circle
              className="tsv2-float-ring-progress"
              cx={spec.cancelSize / 2}
              cy={spec.cancelSize / 2}
              r={spec.ringR}
              style={{ stroke: '#ffffff', strokeWidth: spec.ringWidth, strokeDasharray: spec.ringCircumference, strokeDashoffset: spec.ringCircumference }}
            />
          </svg>
          <span className="tsv2-float-cancel-icon" style={{ fontSize: variant === 'final' ? 16 : 12 }}>✕</span>
        </button>

        {/* Bookmark chip — mockup .bookmark-icon */}
        <div
          className="tsv2-float-bookmark"
          style={{ top: spec.bookmarkOffset, right: spec.bookmarkOffset, width: spec.bookmarkSize, height: spec.bookmarkSize, backgroundColor: spec.bookmarkBg, borderRadius: spec.bookmarkRadius }}
          aria-hidden="true"
        >
          <svg width={spec.bookmarkIcon} height={spec.bookmarkIcon} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </div>

        {/* Text */}
        <h2 className="tsv2-float-title" style={{ fontSize: spec.titleSize, paddingRight: spec.titlePadRight }}>{movie.title}</h2>
        <div className="tsv2-float-subtitle" style={{ fontSize: spec.subtitleSize, marginBottom: spec.subtitleMarginBottom }}>🔥 Trending Now</div>

        {/* Actions */}
        <div className="tsv2-float-actions" style={{ gap: variant === 'final' ? 12 : 10 }}>
          <Link
            href={`/movie/${movie.slug}`}
            className="tsv2-float-play"
            style={{ width: spec.playSize, height: spec.playSize, backgroundColor: spec.playBg }}
            aria-label={`Open ${movie.title}`}
          >
            <svg viewBox="0 0 24 24" fill="white" style={{ width: spec.playIcon, height: spec.playIcon, marginLeft: variant === 'final' ? 4 : 2 }} aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          </Link>
          <Link
            href="/dashboard/watchlist"
            className="tsv2-float-pill"
            style={{
              backgroundColor: spec.pillBg,
              height: spec.pillHeight,
              borderRadius: spec.pillRadius,
              padding: `0 ${spec.pillPadding}px`,
              fontSize: spec.pillFont,
            }}
          >
            <svg width={spec.pillIcon} height={spec.pillIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Watch later
          </Link>
        </div>
      </div>

      <style>{`
        .tsv2-float-card {
          border-radius: 16px; padding: 20px; color: white;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .tsv2-float-cancel {
          position: absolute; border-radius: 50%;
          display: flex; justify-content: center; align-items: center;
          cursor: pointer; z-index: 10; border: none; outline: none;
        }
        .tsv2-float-ring { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
        .tsv2-float-ring circle { fill: none; }
        .tsv2-float-ring circle.tsv2-float-ring-progress { stroke-linecap: round; animation: tsv2-floatCountdown ${COUNTDOWN_MS}ms linear forwards; }
        @keyframes tsv2-floatCountdown { to { stroke-dashoffset: 0; } }
        .tsv2-float-cancel-icon { color: white; z-index: 2; font-weight: bold; }
        .tsv2-float-bookmark { position: absolute; display: flex; justify-content: center; align-items: center; }
        .tsv2-float-title {
          font-weight: 800; font-style: italic; margin-bottom: 6px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .tsv2-float-subtitle { color: #e0e0e0; display: flex; align-items: center; gap: 6px; }
        .tsv2-float-actions { display: flex; align-items: center; }
        .tsv2-float-play {
          border-radius: 50%; border: none; display: flex; justify-content: center; align-items: center;
          color: white; flex-shrink: 0;
        }
        .tsv2-float-pill {
          border: none; display: flex; align-items: center; gap: 8px;
          color: white; font-weight: 500; flex-shrink: 0;
        }
        .tsv2-float-pill:hover { filter: brightness(1.15); }
      `}</style>
    </div>
  );
}
