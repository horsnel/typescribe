'use client';

/**
 * "Vertical Hero Card" — implemented 1:1 from the user's mockup
 * (deepseek_html_20261120_3a80a1.html).
 *
 * Design contract (do not restyle): 340x480 poster card, radius 24, with the
 * conic-gradient #E5B15B border that drains over 15s (mask-composite trick);
 * gold "Trending #N" badge; 26px/800 title; gray meta row; full-width white
 * "Watch Now" button; glass ✕ top-right.
 *
 * Functional layer: when the border finishes draining, the card advances to
 * the next trending title and the border restarts; ✕ skips and hides; Watch
 * Now opens the movie page.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Trophy } from 'lucide-react';
import { resolveImageUrl } from '@/lib/utils';
import type { Movie } from '@/lib/types';

const ROTATE_MS = 15000;

export default function TrendingSpotlight() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/browse?source=trending&count=8', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.movies?.length > 0) setMovies(data.movies);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const visible = useMemo(() => movies.filter((m) => !hiddenIds.has(m.id)), [movies, hiddenIds]);

  if (loading) {
    return (
      <section className="py-16 bg-[#050507]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-[#D4A853] animate-spin" strokeWidth={1.5} />
        </div>
      </section>
    );
  }
  if (visible.length === 0) return null;

  // Rank reflects the title's position in the original trending list.
  const current = visible[index % visible.length];
  const rank = movies.findIndex((m) => m.id === current.id) + 1;
  const year = current.release_date ? current.release_date.slice(0, 4) : '';
  const genreName = current.genres?.[0]?.name || '';

  const advance = () => {
    setIndex((i) => (visible.length > 1 ? (i + 1) % visible.length : i));
    setCycle((c) => c + 1);
  };
  const skip = () => {
    setHiddenIds((prevHidden) => {
      const nextHidden = new Set(prevHidden);
      nextHidden.add(current.id);
      return nextHidden;
    });
    setCycle((c) => c + 1);
  };

  return (
    <section className="py-16 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="reveal-section flex items-center justify-between mb-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#0c0c10] border border-[#D4A853]/25 shadow-sm">
            <Trophy className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none m-0">Trending #1 Spotlight</h2>
          </div>
        </div>

        <div className="reveal-section flex justify-center">
          <div key={`${current.id}-${cycle}`} className="tsv2-hero-card" onAnimationEnd={advance}>
            <div className="absolute inset-0" style={{ backgroundImage: `url(${resolveImageUrl(current.poster_path || current.backdrop_path, 'w500')})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <button type="button" onClick={skip} aria-label="Skip this title" className="tsv2-hero-cancel">✕</button>
            <div className="absolute bottom-0 left-0 right-0 p-6 z-[5] text-white">
              <span className="tsv2-hero-badge">Trending #{rank}</span>
              <div className="text-[26px] font-extrabold leading-[1.1] mb-2">{current.title}</div>
              <div className="text-[13px] text-[#aaa] mb-5 flex gap-3">
                {(current.vote_average ?? 0) > 0 && <span>★ {(current.vote_average ?? 0).toFixed(1)}</span>}
                {year && <span>{year}</span>}
                {genreName && <span>{genreName}</span>}
              </div>
              <Link
                href={`/movie/${current.slug}`}
                className="tsv2-hero-watch w-full bg-white text-black border-none p-4 rounded-xl font-extrabold text-[15px] cursor-pointer flex justify-center items-center gap-2 hover:bg-white/90 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                Watch Now
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .tsv2-hero-card {
          position: relative; width: 100%; max-width: 340px; height: 480px;
          border-radius: 24px; overflow: hidden; background: #111;
          box-shadow: 0 25px 50px rgba(0,0,0,0.8);
        }
        .tsv2-hero-card::before {
          content: ''; position: absolute; inset: 0; border-radius: 24px; padding: 3px;
          background: conic-gradient(from 0deg, #E5B15B 0%, transparent 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          animation: tsv2-drainBorder ${ROTATE_MS}ms linear forwards; z-index: 10; pointer-events: none;
        }
        @keyframes tsv2-drainBorder { to { opacity: 0; } }
        .tsv2-hero-card > .absolute.inset-0::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(to top, #000 0%, rgba(0,0,0,0.4) 50%, transparent 100%);
        }
        .tsv2-hero-cancel {
          position: absolute; top: 16px; right: 16px; width: 32px; height: 32px;
          background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; color: white; font-size: 14px;
          cursor: pointer; z-index: 20; display: flex; justify-content: center; align-items: center;
        }
        .tsv2-hero-badge {
          background: #E5B15B; color: #000; font-size: 10px; font-weight: 800; padding: 4px 8px;
          border-radius: 4px; display: inline-block; margin-bottom: 8px; text-transform: uppercase;
        }
        @media (prefers-reduced-motion: reduce) {
          .tsv2-hero-card::before { animation: none; opacity: 0.35; }
        }
      `}</style>
    </section>
  );
}
