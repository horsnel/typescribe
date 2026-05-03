'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Star, ChevronLeft, ChevronRight, MonitorPlay, ChevronRight as ArrowRight, Loader2 } from 'lucide-react';
import type { StreamableMovie } from '@/lib/streaming-pipeline/types';

/* ─── Streaming Card Component ─── */

function StreamingCard({ movie }: { movie: StreamableMovie }) {
  return (
    <Link
      href={`/stream/${encodeURIComponent(movie.id)}`}
      className="flex-shrink-0 w-[160px] md:w-[200px] group/card"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#0c0c10] border border-[#1e1e28]/50">
        <img
          src={movie.poster}
          alt={movie.title}
          className="w-full h-full object-cover transition-all duration-300 group-hover/card:scale-105 group-hover/card:brightness-75"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/poster-1.jpg';
          }}
        />
        {/* Quality badge */}
        <div className="absolute top-2 left-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            movie.quality === '4K'
              ? 'bg-[#d4a853] text-black'
              : movie.quality === '1080p'
              ? 'bg-blue-500/80 text-white'
              : 'bg-white/20 text-white/90 backdrop-blur-sm'
          }`}>
            {movie.quality}
          </span>
        </div>
        {/* Rating badge */}
        {movie.rating > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            <Star className="w-2.5 h-2.5 text-[#d4a853] fill-[#d4a853]" strokeWidth={1.5} />
            {movie.rating}
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 bg-[#d4a853]/90 rounded-full flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-black fill-black ml-0.5" strokeWidth={2} />
          </div>
        </div>
      </div>
      <div className="mt-2.5">
        <h3 className="text-sm font-medium text-[#f1f1f4] truncate group-hover/card:text-[#d4a853] transition-colors">
          {movie.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          {movie.year > 0 && <span className="text-[11px] text-[#9ca3af]">{movie.year}</span>}
          {movie.year > 0 && <span className="text-[#1e1e28]">·</span>}
          <span className="text-[11px] text-[#9ca3af]">{movie.duration}</span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Now Streaming Section Component ─── */

export default function NowStreamingSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [movies, setMovies] = useState<StreamableMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  // Fetch catalog on mount
  useEffect(() => {
    async function fetchCatalog() {
      try {
        const res = await fetch('/api/streaming/catalog');
        if (!res.ok) throw new Error('Failed to fetch catalog');
        const data = await res.json();
        setMovies((data.movies || []).slice(0, 12));
      } catch (err) {
        console.error('Failed to load streaming catalog:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchCatalog();
  }, []);

  // Update scroll buttons visibility
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };

  // Loading state
  if (loading) {
    return (
      <section className="py-10 md:py-14 bg-[#050507] border-y border-[#1e1e28]/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center gap-2 mb-6">
            <MonitorPlay className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} />
            <h2 className="text-lg md:text-xl font-bold text-white">Now Streaming</h2>
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 bg-[#d4a853]/10 text-[#d4a853] border border-[#d4a853]/20 rounded-full ml-2">
              StreamFlix
            </span>
          </div>
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#d4a853] animate-spin" strokeWidth={1.5} />
          </div>
        </div>
      </section>
    );
  }

  // Error / fallback state
  if (error || movies.length === 0) {
    return (
      <section className="py-10 md:py-14 bg-[#050507] border-y border-[#1e1e28]/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center gap-2 mb-6">
            <MonitorPlay className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} />
            <h2 className="text-lg md:text-xl font-bold text-white">Now Streaming</h2>
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 bg-[#d4a853]/10 text-[#d4a853] border border-[#d4a853]/20 rounded-full ml-2">
              StreamFlix
            </span>
          </div>
          <div className="text-center py-12">
            <p className="text-white/40 text-sm mb-4">Unable to load streaming catalog right now.</p>
            <Link
              href="/stream"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#d4a853]/10 border border-[#d4a853]/20 text-[#d4a853] rounded-lg text-sm font-medium hover:bg-[#d4a853]/20 transition-colors"
            >
              <MonitorPlay className="w-4 h-4" strokeWidth={1.5} />
              Browse StreamFlix
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-14 bg-[#050507] border-y border-[#1e1e28]/30">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6 px-6 lg:px-12">
          <div className="flex items-center gap-2">
            <MonitorPlay className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} />
            <h2 className="text-lg md:text-xl font-bold text-white">Now Streaming</h2>
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 bg-[#d4a853]/10 text-[#d4a853] border border-[#d4a853]/20 rounded-full ml-2">
              StreamFlix
            </span>
          </div>
          <Link
            href="/stream"
            className="flex items-center gap-1 text-sm text-[#9ca3af] hover:text-[#d4a853] transition-colors group/viewall"
          >
            View All
            <ArrowRight className="w-4 h-4 group-hover/viewall:translate-x-0.5 transition-transform" strokeWidth={1.5} />
          </Link>
        </div>

        {/* Scrollable Row */}
        <div className="relative group/row">
          {showLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#050507] to-transparent z-10 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-6 h-6 text-white" strokeWidth={1.5} />
            </button>
          )}

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-6 lg:px-12 pb-2"
          >
            {movies.map((movie) => (
              <StreamingCard key={movie.id} movie={movie} />
            ))}
          </div>

          {showRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#050507] to-transparent z-10 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-6 h-6 text-white" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
