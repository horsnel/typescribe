'use client';

/**
 * "Diagonal Split Popup" — implemented 1:1 from the user's mockup
 * (deepseek_html_20261120_587fb0.html).
 *
 * Design contract (do not restyle): 380x280 card, #1c1c1e radius 24; the
 * poster fills the top-left triangle via clip-path polygon(0 0,100% 0,0 100%)
 * while the bottom-right triangle is the content panel
 * polygon(100% 0,100% 100%,0 100%); white 24px/800 tabular-nums digital
 * countdown at top-left; right-aligned title + subtitle; #ff453a Watch
 * button + glass save square, padded right 50px; #ff453a ✕ with a 4px
 * #1c1c1e cutout border at bottom-right; slideUp entrance.
 *
 * Behavior: once per session on /upcoming after 6s; the digital timer counts
 * down 15s and auto-closes at 00:00; ✕ / backdrop / Esc suppress it 7 days.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { markPromoSeen, markPromoDismissed, shouldShowPromo } from '@/components/promo/promoGate';
import { resolveImageUrl } from '@/lib/utils';
import type { Movie } from '@/lib/types';

const COUNTDOWN_SECONDS = 15;
const DELAY_MS = 6000;

export default function DiagonalPopup() {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [show, setShow] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const shownRef = useRef(false);

  useEffect(() => {
    const yearFrom = new Date().getFullYear();
    const yearTo = yearFrom + 1;
    const controller = new AbortController();
    fetch(`/api/browse?sort=primary_release_date.asc&yearFrom=${yearFrom}&yearTo=${yearTo}&page=1&source=upcoming`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list: Movie[] = data?.movies || [];
        const withArt = list.find((m) => m.backdrop_path || m.poster_path);
        if (withArt) setMovie(withArt);
      })
      .catch(() => {})
      .finally(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (shownRef.current) return;
      if (!shouldShowPromo('diagonal')) return;
      shownRef.current = true;
      markPromoSeen('diagonal');
      setShow(true);
      setSecondsLeft(COUNTDOWN_SECONDS);
    }, DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const close = () => {
    setShow(false);
    markPromoSeen('diagonal');
  };
  const dismiss = () => {
    setShow(false);
    markPromoDismissed('diagonal');
  };

  useEffect(() => {
    if (!show) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(interval);
          close();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [show]);

  if (!show || !movie) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]" onClick={dismiss} role="presentation">
      <div
        className="tsv2-diag-card relative w-full"
        style={{ maxWidth: 380 }}
        role="dialog"
        aria-modal="true"
        aria-label={`Coming soon: ${movie.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poster triangle — mockup .diagonal-image */}
        <div className="tsv2-diag-image" style={{ backgroundImage: `url(${resolveImageUrl(movie.backdrop_path || movie.poster_path, 'w780')})` }} />

        {/* Digital countdown — mockup .digital-timer */}
        <div className="tsv2-digital-timer">00:{String(secondsLeft).padStart(2, '0')}</div>

        {/* Content triangle — mockup .diagonal-content */}
        <div className="tsv2-diag-content">
          <div className="tsv2-diag-title">{movie.title}</div>
          <div className="tsv2-diag-sub">🔥 Coming Soon</div>
          <div className="tsv2-diag-actions">
            <Link href={`/movie/${movie.slug}`} className="tsv2-diag-play">Watch</Link>
            <Link href="/dashboard/watchlist" className="tsv2-diag-save" aria-label="Open watchlist">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
            </Link>
          </div>
        </div>

        {/* Cancel button, opposite corner — mockup .diagonal-cancel */}
        <button type="button" className="tsv2-diag-cancel" onClick={dismiss} aria-label="Close popup">✕</button>
      </div>

      <style>{`
        .tsv2-diag-card {
          height: 280px; background: #1c1c1e; border-radius: 24px; overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.8);
          animation: tsv2-diagSlideUp 0.5s ease-out;
        }
        @keyframes tsv2-diagSlideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .tsv2-diag-image {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background-color: #242428; background-size: cover; background-position: center;
          clip-path: polygon(0 0, 100% 0, 0 100%);
        }
        .tsv2-diag-content {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #1c1c1e;
          clip-path: polygon(100% 0, 100% 100%, 0 100%);
          display: flex; flex-direction: column; justify-content: flex-end;
          padding: 24px; color: white;
        }
        .tsv2-digital-timer {
          position: absolute; top: 20px; left: 20px;
          font-size: 24px; font-weight: 800; color: white;
          font-variant-numeric: tabular-nums;
          text-shadow: 0 2px 10px rgba(0,0,0,0.8);
          z-index: 10;
        }
        .tsv2-diag-cancel {
          position: absolute; bottom: 20px; right: 20px;
          width: 40px; height: 40px; background: #ff453a;
          border: 4px solid #1c1c1e; border-radius: 50%;
          color: white; font-weight: bold; font-size: 16px;
          display: flex; justify-content: center; align-items: center;
          cursor: pointer; z-index: 20;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }
        .tsv2-diag-title { font-size: 24px; font-weight: 800; line-height: 1.1; margin-bottom: 6px; text-align: right; }
        .tsv2-diag-sub { font-size: 13px; color: #a0a0a5; margin-bottom: 20px; text-align: right; }
        .tsv2-diag-actions { display: flex; justify-content: flex-end; gap: 12px; padding-right: 50px; }
        .tsv2-diag-play {
          background: #ff453a; color: white; border: none; border-radius: 12px;
          padding: 12px 24px; font-weight: 700; font-size: 14px; cursor: pointer;
        }
        .tsv2-diag-save {
          background: rgba(255,255,255,0.1); color: white; border: none; width: 44px; border-radius: 12px;
          display: flex; justify-content: center; align-items: center;
        }
      `}</style>
    </div>
  );
}
