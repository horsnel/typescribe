'use client';

/**
 * "Tall Rich Media Popup" — implemented 1:1 from the user's mockup
 * (deepseek_html_20261120_b9bed3.html).
 *
 * Design contract (do not restyle): 380px card, #1c1c1e radius 20, 180px
 * header image blending into the body, 4px #ff453a linear countdown bar on
 * top, 36px glass ✕ with white SVG countdown ring, #ff453a "Top 10" badge,
 * 24px/800 title, 2-line clamped description, white primary action + glass
 * square secondary, slideUpFade entrance.
 *
 * Behavior: appears once per session on the homepage after 6s, auto-closes
 * when the 15s countdown ends; ✕ / backdrop / Esc dismiss it for 7 days.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { markPromoSeen, markPromoDismissed, shouldShowPromo } from '@/components/promo/promoGate';
import { resolveImageUrl } from '@/lib/utils';
import type { Movie } from '@/lib/types';

const COUNTDOWN_MS = 15000;
const DELAY_MS = 6000;

export default function TallRichPopup() {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [show, setShow] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/browse?source=trending&count=3', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.movies?.length > 0) setMovie(data.movies[0]);
      })
      .catch(() => {})
      .finally(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (shownRef.current) return;
      if (!shouldShowPromo('tallrich')) return;
      shownRef.current = true;
      markPromoSeen('tallrich');
      setShow(true);
    }, DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const close = () => {
    // Auto-close when the 15s countdown ends — seen for this session only.
    setShow(false);
    markPromoSeen('tallrich');
  };
  const dismiss = () => {
    setShow(false);
    markPromoDismissed('tallrich');
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

  if (!show || !movie) return null;

  const year = movie.release_date ? movie.release_date.slice(0, 4) : '';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]" onClick={close} role="presentation">
      <div
        className="tsv2-rich-card relative w-full"
        style={{ maxWidth: 380 }}
        role="dialog"
        aria-modal="true"
        aria-label={`Trending now: ${movie.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top linear timer — mockup .linear-timer-track */}
        <div className="tsv2-linear-timer-track"><div className="tsv2-linear-timer-fill" onAnimationEnd={close} /></div>

        {/* Header image — mockup .card-image */}
        <div className="tsv2-card-image" style={{ backgroundImage: `url(${resolveImageUrl(movie.backdrop_path || movie.poster_path, 'w780')})` }} />

        {/* Circular countdown close — mockup .circular-cancel */}
        <button type="button" className="tsv2-circular-cancel" onClick={dismiss} aria-label="Close popup">
          <svg className="tsv2-ring" viewBox="0 0 36 36" aria-hidden="true">
            <circle className="tsv2-circ-track" cx="18" cy="18" r="16" />
            <circle className="tsv2-circ-progress" cx="18" cy="18" r="16" />
          </svg>
          <span className="tsv2-icon-x">✕</span>
        </button>

        {/* Body — mockup .card-body */}
        <div className="tsv2-card-body">
          <div className="tsv2-badge-row">
            <span className="tsv2-badge">Top 10</span>
            <span className="tsv2-trending-text">🔥 Trending Now</span>
          </div>
          <h2 className="tsv2-title">{movie.title}</h2>
          <p className="tsv2-description">{movie.overview || (year ? `Now trending in ${year}.` : 'One of the most-watched titles right now.')}</p>
          <div className="tsv2-action-row">
            <Link href={`/movie/${movie.slug}`} className="tsv2-btn-primary">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-[18px] h-[18px]"><path d="M8 5v14l11-7z" /></svg>
              Watch Now
            </Link>
            <Link href="/dashboard/watchlist" className="tsv2-btn-secondary" aria-label="Open watchlist">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .tsv2-rich-card {
          background: #1c1c1e; border-radius: 20px; overflow: hidden; color: white;
          box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
          animation: tsv2-slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes tsv2-slideUpFade {
          from { transform: translateY(40px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .tsv2-linear-timer-track { position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: rgba(0,0,0,0.4); z-index: 20; }
        .tsv2-linear-timer-fill { height: 100%; background: #ff453a; width: 100%; animation: tsv2-drainH ${COUNTDOWN_MS}ms linear forwards; }
        @keyframes tsv2-drainH { from { width: 100%; } to { width: 0%; } }
        .tsv2-card-image { height: 180px; background-color: #242428; background-size: cover; background-position: center 20%; position: relative; }
        .tsv2-card-image::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(28,28,30,0) 40%, #1c1c1e 100%); }
        .tsv2-circular-cancel {
          position: absolute; top: 16px; right: 16px; width: 36px; height: 36px;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          border-radius: 50%; display: flex; justify-content: center; align-items: center;
          border: none; cursor: pointer; z-index: 20;
        }
        .tsv2-ring { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
        .tsv2-circ-track { fill: none; stroke: rgba(255,255,255,0.2); stroke-width: 2; }
        .tsv2-circ-progress {
          fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round;
          stroke-dasharray: 100.5; stroke-dashoffset: 100.5; animation: tsv2-drainCirc ${COUNTDOWN_MS}ms linear forwards;
        }
        @keyframes tsv2-drainCirc { from { stroke-dashoffset: 100.5; } to { stroke-dashoffset: 0; } }
        .tsv2-icon-x { color: white; font-size: 14px; font-weight: bold; z-index: 2; }
        .tsv2-card-body { padding: 0 20px 24px 20px; margin-top: -30px; position: relative; z-index: 10; }
        .tsv2-badge-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .tsv2-badge { background: #ff453a; color: white; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 4px; letter-spacing: 0.5px; text-transform: uppercase; }
        .tsv2-trending-text { font-size: 12px; color: #a0a0a5; font-weight: 600; }
        .tsv2-title { font-size: 24px; font-weight: 800; line-height: 1.2; margin-bottom: 8px; letter-spacing: -0.5px; }
        .tsv2-description {
          font-size: 13px; color: #a0a0a5; line-height: 1.4; margin-bottom: 20px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .tsv2-action-row { display: flex; gap: 12px; }
        .tsv2-btn-primary {
          flex: 1; background: #ffffff; color: #000000; border: none; border-radius: 12px; height: 48px;
          font-size: 15px; font-weight: 700; display: flex; justify-content: center; align-items: center;
          gap: 8px; cursor: pointer; transition: transform 0.1s;
        }
        .tsv2-btn-primary:active { transform: scale(0.96); }
        .tsv2-btn-secondary {
          width: 48px; height: 48px; background: rgba(255,255,255,0.1); color: white; border: none;
          border-radius: 12px; display: flex; justify-content: center; align-items: center;
          cursor: pointer; transition: background 0.2s;
        }
        .tsv2-btn-secondary:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
