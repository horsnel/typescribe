'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Film, Clock, ChevronLeft, ChevronRight, Star, Landmark, Sparkles } from 'lucide-react';
import type { StreamableMovie } from '@/lib/streaming-pipeline/types';

/* ─── Vault Collection Type ─── */

interface VaultCollection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  movies: StreamableMovie[];
}

/* ─── Categorization Logic ─── */

function buildVaultCollections(movies: StreamableMovie[]): VaultCollection[] {
  const collections: VaultCollection[] = [];

  // Film Noir — noir, mystery, crime keywords or title hints
  const noir = movies.filter(
    (m) =>
      m.genres.some(
        (g) =>
          g.toLowerCase().includes('noir') ||
          g.toLowerCase().includes('mystery') ||
          g.toLowerCase().includes('crime')
      ) || m.title.match(/noir|detective|stranger|shadow|dark|night/i)
  );
  if (noir.length > 0)
    collections.push({ id: 'noir', title: '1950s Noir', icon: Landmark, movies: noir });

  // Sci-Fi & Horror Cult Classics
  const scifi = movies.filter((m) =>
    m.genres.some(
      (g) =>
        g.toLowerCase().includes('sci-fi') ||
        g.toLowerCase().includes('science fiction') ||
        g.toLowerCase().includes('horror')
    )
  );
  if (scifi.length > 0)
    collections.push({ id: 'cult', title: 'Cult Sci-Fi & Horror', icon: Sparkles, movies: scifi });

  // Animation Gems (Blender Foundation)
  const animation = movies.filter(
    (m) =>
      m.genres.some((g) => g.toLowerCase().includes('animation')) ||
      m.source === 'blender-foundation'
  );
  if (animation.length > 0)
    collections.push({ id: 'animation', title: 'Animation Gems', icon: Film, movies: animation });

  // Action & Adventure
  const action = movies.filter((m) =>
    m.genres.some(
      (g) =>
        g.toLowerCase().includes('action') ||
        g.toLowerCase().includes('adventure')
    )
  );
  if (action.length > 0)
    collections.push({ id: 'action', title: 'Action & Adventure', icon: Film, movies: action });

  // Drama Classics
  const drama = movies.filter((m) =>
    m.genres.some((g) => g.toLowerCase().includes('drama'))
  );
  if (drama.length > 0)
    collections.push({ id: 'drama', title: 'Drama Classics', icon: Film, movies: drama });

  // Comedy
  const comedy = movies.filter((m) =>
    m.genres.some((g) => g.toLowerCase().includes('comedy'))
  );
  if (comedy.length > 0)
    collections.push({ id: 'comedy', title: 'Classic Comedy', icon: Film, movies: comedy });

  // Romance
  const romance = movies.filter((m) =>
    m.genres.some((g) => g.toLowerCase().includes('romance'))
  );
  if (romance.length > 0)
    collections.push({ id: 'romance', title: 'Romance Classics', icon: Film, movies: romance });

  // Western
  const western = movies.filter((m) =>
    m.genres.some((g) => g.toLowerCase().includes('western'))
  );
  if (western.length > 0)
    collections.push({ id: 'western', title: 'Western Legends', icon: Landmark, movies: western });

  // Thriller / Suspense
  const thriller = movies.filter((m) =>
    m.genres.some(
      (g) =>
        g.toLowerCase().includes('thriller') ||
        g.toLowerCase().includes('suspense')
    )
  );
  if (thriller.length > 0)
    collections.push({ id: 'thriller', title: 'Thriller & Suspense', icon: Sparkles, movies: thriller });

  // All remaining uncategorized
  const used = new Set(collections.flatMap((c) => c.movies.map((m) => m.id)));
  const remaining = movies.filter((m) => !used.has(m.id));
  if (remaining.length > 0)
    collections.push({ id: 'more', title: 'More Classics', icon: Film, movies: remaining });

  return collections;
}

/* ─── Source Badge Helper ─── */

function getSourceBadge(source: StreamableMovie['source']) {
  switch (source) {
    case 'blender-foundation':
      return { label: 'CC', classes: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    case 'internet-archive':
      return { label: 'PD', classes: 'bg-amber-500/20 text-violet-400 border-amber-500/30' };
    case 'youtube':
      return { label: 'YT', classes: 'bg-red-500/20 text-red-400 border-red-500/30' };
    default:
      return { label: 'Free', classes: 'bg-white/10 text-white/60 border-white/20' };
  }
}

/* ─── Landscape Card ─── */

function LandscapeCard({ movie }: { movie: StreamableMovie }) {
  const sourceBadge = getSourceBadge(movie.source);

  return (
    <Link
      href={`/stream/${encodeURIComponent(movie.id)}`}
      className="flex-shrink-0 w-[280px] md:w-[320px] group/card"
    >
      <motion.div
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.2 }}
        className="relative aspect-video rounded-xl overflow-hidden bg-[#0c0c10] border border-[#1e1e28]/50"
      >
        {/* Image */}
        <img
          src={movie.backdrop || movie.poster}
          alt={movie.title}
          className="w-full h-full object-cover transition-all duration-300 group-hover/card:brightness-75"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/poster-1.jpg';
          }}
        />

        {/* Bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Quality badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              movie.quality === '4K'
                ? 'bg-[#8B5CF6] text-white'
                : movie.quality === '1080p'
                ? 'bg-[#8B5CF6]/70 text-white'
                : 'bg-white/20 text-white/80 backdrop-blur-sm'
            }`}
          >
            {movie.quality}
          </span>
        </div>

        {/* Source badge */}
        <div className="absolute top-2 right-2">
          <span
            className={`text-[8px] font-medium px-1.5 py-0.5 rounded border backdrop-blur-sm ${sourceBadge.classes}`}
          >
            {sourceBadge.label}
          </span>
        </div>

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 bg-[#8B5CF6]/90 rounded-full flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-black fill-black ml-0.5" strokeWidth={2} />
          </div>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-semibold text-white truncate">{movie.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            {movie.year > 0 && (
              <span className="text-[11px] text-white/60">{movie.year}</span>
            )}
            {movie.year > 0 && <span className="text-white/20">&middot;</span>}
            <span className="text-[11px] text-white/60">{movie.duration}</span>
            {movie.rating > 0 && (
              <>
                <span className="text-white/20">&middot;</span>
                <div className="flex items-center gap-1">
                  <Star
                    className="w-2.5 h-2.5 text-[#8B5CF6] fill-[#8B5CF6]"
                  />
                  <span className="text-[11px] text-white/60">{movie.rating}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

/* ─── Collection Row ─── */

function VaultCollectionRow({
  title,
  icon: Icon,
  movies,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  movies: StreamableMovie[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

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

  // Re-check scroll buttons on mount and resize
  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, []);

  return (
    <section className="mb-8">
      {/* Row header */}
      <div className="flex items-center gap-2 mb-4 px-4 md:px-12">
        <Icon className="w-5 h-5 text-[#8B5CF6]" strokeWidth={1.5} />
        <h3 className="text-base md:text-lg font-bold text-white">{title}</h3>
        <span className="text-xs text-white/30 ml-2">
          {movies.length} film{movies.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrollable area */}
      <div className="relative group/row">
        {/* Left scroll button */}
        {showLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#050507] to-transparent z-10 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6 text-white" strokeWidth={1.5} />
          </button>
        )}

        {/* Card row */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-4 md:px-12 pb-2"
        >
          {movies.map((movie) => (
            <LandscapeCard key={movie.id} movie={movie} />
          ))}
        </div>

        {/* Right scroll button */}
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
    </section>
  );
}

/* ─── Loading Skeleton ─── */

function VaultSkeleton() {
  return (
    <section className="py-16 bg-[#050507]">
      {/* Header skeleton */}
      <div className="px-4 md:px-12 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1e1e28]/50 animate-pulse" />
          <div>
            <div className="h-6 w-72 bg-[#1e1e28]/50 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-[#1e1e28]/30 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Row skeletons */}
      {[1, 2, 3].map((row) => (
        <div key={row} className="mb-8">
          <div className="flex items-center gap-2 mb-4 px-4 md:px-12">
            <div className="w-5 h-5 bg-[#1e1e28]/50 rounded animate-pulse" />
            <div className="h-5 w-36 bg-[#1e1e28]/50 rounded animate-pulse" />
            <div className="h-3 w-12 bg-[#1e1e28]/30 rounded animate-pulse ml-2" />
          </div>
          <div className="flex gap-3 md:gap-4 overflow-hidden px-4 md:px-12">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[280px] md:w-[320px] aspect-video rounded-xl bg-[#0c0c10] border border-[#1e1e28]/50 animate-pulse"
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

/* ─── Main Vault Section ─── */

export default function VaultSection() {
  const [movies, setMovies] = useState<StreamableMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchCatalog() {
      try {
        const res = await fetch('/api/streaming/catalog');
        if (!res.ok) throw new Error('Failed to fetch catalog');
        const data = await res.json();
        if (!cancelled && data?.movies) {
          setMovies(data.movies);
        }
      } catch (err) {
        console.error('[VaultSection] Failed to load vault catalog:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const collections = buildVaultCollections(movies);

  // Loading state
  if (loading) {
    return <VaultSkeleton />;
  }

  // Error or empty — don't render section
  if (error || movies.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-[#050507]">
      {/* Section Header */}
      <div className="px-4 md:px-12 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-[#8B5CF6]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              From the Vault: Classic Masterpieces
            </h2>
            <p className="text-[#9ca3af] text-xs md:text-sm">
              Free, legal streaming &mdash; public domain &amp; creative commons films
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 mt-4 ml-[52px]">
          <div className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-white/30" strokeWidth={1.5} />
            <span className="text-[11px] text-white/40">
              {movies.length} film{movies.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-white/30" strokeWidth={1.5} />
            <span className="text-[11px] text-white/40">
              {movies.filter((m) => m.source === 'internet-archive').length} Public Domain
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-white/30" strokeWidth={1.5} />
            <span className="text-[11px] text-white/40">
              {movies.filter((m) => m.source === 'blender-foundation').length} Creative Commons
            </span>
          </div>
          {movies.some((m) => m.is4K) && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 rounded-full">
              4K Available
            </span>
          )}
        </div>
      </div>

      {/* Collection Rows */}
      {collections.map((collection) => (
        <VaultCollectionRow
          key={collection.id}
          title={collection.title}
          icon={collection.icon}
          movies={collection.movies}
        />
      ))}

      {/* Bottom CTA */}
      <div className="px-4 md:px-12 mt-4">
        <Link
          href="/stream"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0c0c10] border border-[#1e1e28] rounded-xl text-sm text-[#9ca3af] hover:text-white hover:border-[#3a3a45] transition-colors group/cta"
        >
          <Play className="w-4 h-4 text-[#8B5CF6]" strokeWidth={1.5} />
          Explore Full Streaming Library
          <ChevronRight
            className="w-4 h-4 group-hover/cta:translate-x-0.5 transition-transform"
            strokeWidth={1.5}
          />
        </Link>
      </div>
    </section>
  );
}
