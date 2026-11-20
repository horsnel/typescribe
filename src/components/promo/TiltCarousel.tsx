'use client';

/**
 * "3D Tilt Carousel" — implemented 1:1 from the user's mockup
 * (deepseek_html_20261120_dec20f.html).
 *
 * Design contract (do not restyle): center card 260x340 #111 radius-20 with a
 * floating animation; tilted side cards 60x220 #1A1A1A at 0.5 opacity,
 * rotateY(±25deg) scale(.9); 4px vertical #E5B15B timer draining 15s on the
 * main card's right edge; glass ✕ top-right.
 *
 * Functional layer added around the untouched visual: side cards become the
 * neighbouring trending posters (still at mockup opacity/tilt) and are
 * clickable, the 15s timer auto-advances, ✕ hides the current title, and the
 * card links to the movie page.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Flame, Loader2 } from 'lucide-react';
import { resolveImageUrl } from '@/lib/utils';
import type { Movie } from '@/lib/types';

const ADVANCE_MS = 15000;

export default function TiltCarousel() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/browse?source=trending&count=12', { signal: controller.signal })
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

  const current = visible[index % visible.length];
  const prev = visible.length > 1 ? visible[(index - 1 + visible.length) % visible.length] : null;
  const next = visible.length > 1 ? visible[(index + 1) % visible.length] : null;

  const advance = () => {
    setIndex((i) => (visible.length > 1 ? (i + 1) % visible.length : i));
    setCycle((c) => c + 1);
  };
  const step = (dir: 1 | -1) => {
    setIndex((i) => (i + dir + visible.length) % visible.length);
    setCycle((c) => c + 1);
  };
  const hideCurrent = () => {
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
            <Flame className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none m-0">Trending Spotlight</h2>
          </div>
          <Link href="/browse" aria-label="Browse all trending titles" className="flex items-center justify-center w-9 h-9 rounded-full bg-[#0c0c10] border border-white/[0.06] text-white hover:border-[#D4A853] hover:text-[#D4A853] transition-colors">
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="tsv2-tilt-scene reveal-section flex items-center justify-center select-none" style={{ perspective: '1000px' }}>
          <div className="flex items-center justify-center gap-5 w-full max-w-[400px]">
            {/* Left neighbour — mockup bg-card .left */}
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous trending title"
              className="tsv2-bg-card tsv2-bg-card-left hidden sm:block flex-shrink-0"
              style={prev ? { backgroundImage: `url(${resolveImageUrl(prev.poster_path, 'w185')})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            />
            {/* Main tilt card — mockup .main-tilt-card */}
            <div key={`${current.id}-${cycle}`} className="tsv2-main-card relative z-10">
              <div className="tsv2-side-timer-track"><div key={cycle} className="tsv2-side-timer-fill" onAnimationEnd={advance} /></div>
              <button type="button" onClick={hideCurrent} aria-label="Hide this title" className="tsv2-tilt-cancel">✕</button>
              <Link href={`/movie/${current.slug}`} aria-label={`Open ${current.title}`} className="block">
                <div className="w-full h-[200px] bg-[#1A1A1A]" style={{ backgroundImage: `url(${resolveImageUrl(current.backdrop_path || current.poster_path, 'w500')})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="p-4 text-white">
                  <div className="text-lg font-extrabold mb-1 leading-tight line-clamp-1">{current.title}</div>
                  <div className="text-xs text-[#E5B15B] font-semibold">🔥 Trending Now</div>
                </div>
              </Link>
            </div>
            {/* Right neighbour — mockup bg-card .right */}
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next trending title"
              className="tsv2-bg-card tsv2-bg-card-right hidden sm:block flex-shrink-0"
              style={next ? { backgroundImage: `url(${resolveImageUrl(next.poster_path, 'w185')})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            />
          </div>
        </div>
      </div>

      <style>{`
        .tsv2-bg-card { width: 60px; height: 220px; border-radius: 16px; background-color: #1A1A1A; opacity: 0.5; border: none; padding: 0; cursor: pointer; transition: opacity 0.2s; }
        .tsv2-bg-card:hover { opacity: 0.75; }
        .tsv2-bg-card-left { transform: rotateY(25deg) scale(0.9) translateX(20px); }
        .tsv2-bg-card-right { transform: rotateY(-25deg) scale(0.9) translateX(-20px); }
        .tsv2-main-card {
          width: 260px; height: 340px; background: #111; border-radius: 20px; overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05);
          animation: tsv2-float 4s ease-in-out infinite;
        }
        @keyframes tsv2-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .tsv2-side-timer-track { position: absolute; top: 0; right: 0; bottom: 0; width: 4px; background: rgba(255,255,255,0.1); z-index: 10; }
        .tsv2-side-timer-fill { width: 100%; background: #E5B15B; height: 100%; animation: tsv2-drainV ${ADVANCE_MS}ms linear forwards; }
        @keyframes tsv2-drainV { to { height: 0%; } }
        .tsv2-tilt-cancel {
          position: absolute; top: 12px; right: 12px; width: 28px; height: 28px;
          background: rgba(0,0,0,0.6); border: none; border-radius: 50%; color: white; font-size: 12px;
          cursor: pointer; display: flex; justify-content: center; align-items: center; z-index: 20;
        }
        @media (prefers-reduced-motion: reduce) {
          .tsv2-main-card { animation: none; }
          .tsv2-side-timer-fill { animation: none; height: 0%; }
        }
      `}</style>
    </section>
  );
}
