'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Trophy, ChevronLeft, ChevronRight, Loader2,
  Star, Play, ArrowRight, Crown, Sparkles,
  Flame, Ghost, Baby, Clapperboard, Globe2, Swords, Sparkle, Tv2, Drama,
} from 'lucide-react';
import MovieCard from '@/components/movie/MovieCard';
import type { Movie } from '@/lib/types';
import { resolveImageUrl, handleImageError, POSTER_PLACEHOLDER } from '@/lib/utils';

/* ─── Unique icon per category ─── */
const CATEGORY_ICONS: Record<string, { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; color: string }> = {
  'trending':      { icon: Flame,        color: 'text-orange-400' },
  'hollywood':     { icon: Clapperboard,  color: 'text-yellow-400' },
  'bollywood':     { icon: Sparkle,       color: 'text-orange-500' },
  'kdrama':        { icon: Drama,         color: 'text-pink-400' },
  'nollywood':     { icon: Globe2,        color: 'text-green-400' },
  'anime':         { icon: Swords,        color: 'text-[#D4A853]' },
  'thai':          { icon: Tv2,           color: 'text-teal-400' },
  'cdrama':        { icon: Globe2,        color: 'text-red-400' },
  'south-african': { icon: Globe2,        color: 'text-emerald-400' },
  'horror':        { icon: Ghost,         color: 'text-[#D4A853]' },
  'kids':          { icon: Baby,          color: 'text-cyan-400' },
  'classics':      { icon: Clapperboard,  color: 'text-amber-400' },
  'uk':            { icon: Tv2,           color: 'text-blue-400' },
  'action':        { icon: Swords,        color: 'text-red-400' },
  'romance':       { icon: Drama,         color: 'text-rose-400' },
};

function getCategoryIcon(categoryId: string) {
  const lower = categoryId.toLowerCase();
  for (const key of Object.keys(CATEGORY_ICONS)) {
    if (lower.includes(key)) return CATEGORY_ICONS[key];
  }
  return { icon: Crown, color: 'text-[#D4A853]' };
}

interface TopChoiceCategory {
  id: string;
  label: string;
  flag: string;
  movie: Movie | null;
}

function TopChoiceCard({ category }: { category: TopChoiceCategory }) {
  const { label, flag, movie } = category;
  if (!movie) return null;

  const year = movie.release_date ? movie.release_date.split('-')[0] : '';
  const genreNames = movie.genres
    .filter(g => g.name)
    .slice(0, 2)
    .map(g => g.name);

  const catIcon = getCategoryIcon(category.id);
  const CatIconComp = catIcon.icon;

  return (
    <Link
      href={movie.slug ? `/movie/${movie.slug}` : '#'}
      className="flex-shrink-0 w-[240px] sm:w-[270px] md:w-[300px] group/topcard"
    >
      <div className="relative rounded-2xl overflow-hidden bg-[#0a0a0f] border border-[#1e1e28]/50 hover:border-[#D4A853]/30 transition-all duration-300">
        {/* Poster Image — larger */}
        <div className="relative aspect-[2/3] overflow-hidden">
          <img
            src={resolveImageUrl(movie.poster_path, 'w500')}
            alt={movie.title}
            className="w-full h-full object-cover transition-all duration-500 group-hover/topcard:scale-110 group-hover/topcard:brightness-75"
            loading="lazy"
            onError={(e) => handleImageError(e, 'poster')}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/30 to-transparent" />

          {/* Category Badge - top left with unique icon */}
          <div className="absolute top-3 left-3 z-10">
            <div className="flex items-center gap-1.5 bg-[#D4A853] text-black text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
              <CatIconComp className={`w-3 h-3 ${catIcon.color}`} strokeWidth={2} />
              <span className="text-xs">{flag}</span>
              <span>{label}</span>
            </div>
          </div>

          {/* #1 Badge - top right */}
          <div className="absolute top-3 right-3 z-10">
            <div className="w-7 h-7 bg-black/70 backdrop-blur-sm border border-[#D4A853]/40 rounded-full flex items-center justify-center">
              <span className="text-[10px] font-black text-[#D4A853]">#1</span>
            </div>
          </div>

          {/* Rating badge */}
          <div className="absolute bottom-14 right-3 z-10">
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-1 rounded-full border border-white/10">
              <Star className="w-3 h-3 text-[#D4A853] fill-[#D4A853]" strokeWidth={1.5} />
              {movie.vote_average.toFixed(1)}
            </div>
          </div>

          {/* Play overlay on hover */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/topcard:opacity-100 transition-opacity duration-300 z-10">
            <div className="w-14 h-14 bg-[#D4A853]/90 rounded-full flex items-center justify-center shadow-2xl transform scale-75 group-hover/topcard:scale-100 transition-transform duration-300">
              <Play className="w-6 h-6 text-black fill-black ml-0.5" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Movie Info */}
        <div className="p-3 -mt-8 relative z-10">
          <h3 className="text-sm font-bold text-white truncate group-hover/topcard:text-[#D4A853] transition-colors">
            {movie.title}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            {year && <span className="text-[11px] text-[#9ca3af]">{year}</span>}
            {genreNames.map((g) => (
              <span
                key={g}
                className="text-[9px] font-medium text-[#9ca3af] bg-[#1a1a22] border border-[#2a2a35] px-1.5 py-0.5 rounded-full"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function TopChoiceSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<TopChoiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/top-choice', { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.categories?.length > 0) {
          setCategories(data.categories);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -480 : 480, behavior: 'smooth' });
  };

  if (!loading && categories.length === 0) return null;

  return (
    <section className="py-10 md:py-14 bg-[#050507] border-y border-[#1e1e28]/30">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6 px-6 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#D4A853] to-[#B8922F] rounded-xl flex items-center justify-center shadow-lg shadow-[#D4A853]/20">
              <Trophy className="w-5 h-5 text-black" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                Top Choice
                <Sparkles className="w-4 h-4 text-[#D4A853]" strokeWidth={1.5} />
              </h2>
              <p className="text-[11px] text-[#6b7280] mt-0.5">
                The #1 trending title from every genre & region
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0c0c10] border border-[#1e1e28] text-white hover:border-[#D4A853] hover:text-[#D4A853] transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0c0c10] border border-[#1e1e28] text-white hover:border-[#D4A853] hover:text-[#D4A853] transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <Link
              href="/browse"
              className="flex items-center gap-1 text-sm text-[#9ca3af] hover:text-[#D4A853] transition-colors group/viewall"
            >
              Explore All
              <ArrowRight className="w-4 h-4 group-hover/viewall:translate-x-0.5 transition-transform" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        {/* Scrollable Row */}
        {loading ? (
          <div className="flex items-center justify-center py-16 px-6 lg:px-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-[#D4A853] animate-spin mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm text-[#6b7280]">Finding the top picks from every region...</p>
            </div>
          </div>
        ) : (
          <div className="relative group/row">
            {showLeft && (
              <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-r from-[#050507] to-transparent z-10 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-6 h-6 text-white" strokeWidth={1.5} />
              </button>
            )}

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-hide px-6 lg:px-12 pb-2"
            >
              {categories.map((category) => (
                <TopChoiceCard key={category.id} category={category} />
              ))}
            </div>

            {showRight && (
              <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-0 bottom-0 w-14 bg-gradient-to-l from-[#050507] to-transparent z-10 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-6 h-6 text-white" strokeWidth={1.5} />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
