'use client';

/**
 * "Split Grid Card" row — implemented 1:1 from the user's mockup
 * (deepseek_html_20261120_678400.html).
 *
 * Design contract (do not restyle): horizontal card, 40% image / 60% data
 * split with a hairline divider, bg #0a0a0a radius 16, 16px/800 title, 11px
 * #888 meta, #E5B15B rating + flat gold "Watch" button, and the 32px SVG
 * countdown ring (#E5B15B stroke, fills over 15s) wrapping a #1a1a1a ✕.
 *
 * Placed on /discover (a text-only page) as a live "trending right now" row.
 * ✕ dismisses a card; a title's Watch button opens the movie page.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { resolveImageUrl } from '@/lib/utils';
import type { Movie } from '@/lib/types';

const RING_MS = 15000;

export default function TrendingCompactGrid() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/browse?source=trending&count=6', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.movies?.length > 0) setMovies(data.movies.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const visible = useMemo(() => movies.filter((m) => !hiddenIds.has(m.id)), [movies, hiddenIds]);

  if (loading || visible.length === 0) return null;

  return (
    <div className="mb-14">
      <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#0c0c10] border border-[#D4A853]/25 shadow-sm mb-6">
        <Flame className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none m-0">Trending Right Now</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
        {visible.map((movie) => {
          const year = movie.release_date ? movie.release_date.slice(0, 4) : '';
          const genreName = movie.genres?.[0]?.name || '';
          return (
            <div key={movie.id} className="tsv2-grid-card w-full" style={{ maxWidth: 380 }}>
              <div className="tsv2-grid-img" style={{ backgroundImage: `url(${resolveImageUrl(movie.backdrop_path || movie.poster_path, 'w342')})` }} />
              <div className="tsv2-grid-data">
                <div className="tsv2-data-top">
                  <div className="min-w-0">
                    <div className="tsv2-data-title">{movie.title}</div>
                    <div className="tsv2-data-meta">{[year, genreName].filter(Boolean).join(' • ')}</div>
                  </div>
                </div>
                <div className="tsv2-data-bottom">
                  {/* Unreleased titles have vote_average 0 — show nothing rather than ★ 0.0 */}
                  {(movie.vote_average ?? 0) > 0 ? <div className="tsv2-data-rating">★ {(movie.vote_average ?? 0).toFixed(1)}</div> : <div />}
                  <Link href={`/movie/${movie.slug}`} className="tsv2-btn-play-flat">Watch</Link>
                </div>
              </div>

              {/* Countdown ring + cancel — mockup .cancel-timer-wrapper */}
              <div className="tsv2-cancel-timer-wrapper">
                <svg viewBox="0 0 32 32" aria-hidden="true">
                  <circle className="tsv2-ring-track" cx="16" cy="16" r="14" />
                  <circle className="tsv2-ring-progress" cx="16" cy="16" r="14" />
                </svg>
                <button
                  type="button"
                  aria-label={`Dismiss ${movie.title}`}
                  className="tsv2-cancel-x-inner"
                  onClick={() => setHiddenIds((prevHidden) => {
                    const nextHidden = new Set(prevHidden);
                    nextHidden.add(movie.id);
                    return nextHidden;
                  })}
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .tsv2-grid-card {
          display: flex; height: 160px; background: #0a0a0a;
          border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
          overflow: hidden; position: relative; color: white;
        }
        .tsv2-grid-img { width: 40%; background-color: #14141a; background-size: cover; background-position: center; }
        .tsv2-grid-data {
          width: 60%; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;
          border-left: 1px solid rgba(255,255,255,0.05);
        }
        .tsv2-data-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .tsv2-data-title { font-size: 16px; font-weight: 800; line-height: 1.2; }
        .tsv2-data-meta { font-size: 11px; color: #888; margin-top: 4px; }
        .tsv2-data-rating { font-size: 12px; color: #E5B15B; font-weight: 700; display: flex; align-items: center; gap: 4px; }
        .tsv2-data-bottom { display: flex; align-items: center; justify-content: space-between; }
        .tsv2-btn-play-flat {
          background: #E5B15B; color: #000; border: none; padding: 8px 16px; border-radius: 6px;
          font-weight: 800; font-size: 12px; cursor: pointer; display: inline-block;
        }
        .tsv2-btn-play-flat:hover { filter: brightness(1.08); }
        .tsv2-cancel-timer-wrapper { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; }
        .tsv2-cancel-timer-wrapper svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
        .tsv2-ring-track { fill: none; stroke: rgba(255,255,255,0.1); stroke-width: 2; }
        .tsv2-ring-progress {
          fill: none; stroke: #E5B15B; stroke-width: 2; stroke-linecap: round;
          stroke-dasharray: 88; stroke-dashoffset: 88; animation: tsv2-drainRing ${RING_MS}ms linear forwards;
        }
        @keyframes tsv2-drainRing { to { stroke-dashoffset: 0; } }
        .tsv2-cancel-x-inner {
          position: absolute; top: 4px; left: 4px; width: 24px; height: 24px; background: #1a1a1a;
          border: none; border-radius: 50%; display: flex; justify-content: center; align-items: center;
          font-size: 10px; color: #888; cursor: pointer;
        }
        .tsv2-cancel-x-inner:hover { color: white; }
        @media (prefers-reduced-motion: reduce) {
          .tsv2-ring-progress { animation-duration: 1ms; }
        }
      `}</style>
    </div>
  );
}
