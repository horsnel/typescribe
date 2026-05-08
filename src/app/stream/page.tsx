'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Star, ChevronLeft, ChevronRight, Crown, Sparkles, Award, Swords, Palette, Wand2, Info, Search, Loader2, ExternalLink, Tv, Film, Globe } from 'lucide-react';
import type { StreamableMovie, StreamingCategory } from '@/lib/streaming-pipeline/types';

/* ─── Icon Map ─── */

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Sparkles, Crown, Award, Swords, Palette, Wand2, Tv, Film, Globe, ExternalLink,
};

/* ─── Source Badge Map ─── */

function getSourceBadge(source: StreamableMovie['source']): { label: string; className: string } {
  switch (source) {
    case 'blender-foundation':
      return { label: 'CC', className: 'bg-[#8B5CF6]/30 text-[#A78BFA]' };
    case 'internet-archive':
      return { label: 'IA', className: 'bg-blue-500/20 text-blue-400' };
    case 'youtube':
      return { label: 'YT', className: 'bg-red-500/20 text-red-400' };
    case 'vimeo-cc':
      return { label: 'Vimeo', className: 'bg-cyan-500/20 text-cyan-400' };
    case 'tubi':
      return { label: 'Tubi', className: 'bg-red-600/20 text-red-400' };
    case 'pluto-tv':
      return { label: 'Pluto', className: 'bg-indigo-500/20 text-indigo-300' };
    case 'bilibili':
      return { label: 'Bili', className: 'bg-sky-500/20 text-sky-400' };
    case 'plex-free':
      return { label: 'Plex', className: 'bg-amber-500/20 text-amber-400' };
    case 'openflix':
      return { label: 'Open', className: 'bg-emerald-500/20 text-emerald-400' };
    default:
      return { label: 'Free', className: 'bg-white/10 text-white/70' };
  }
}

/* ─── Movie Row Component ─── */

function MovieRow({ title, icon: Icon, movies }: { title: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; movies: StreamableMovie[] }) {
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
    el.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };

  return (
    <section className="mb-8 md:mb-12">
      <div className="flex items-center gap-2 mb-4 px-4 md:px-12">
        <Icon className="w-5 h-5 text-[#8B5CF6]" strokeWidth={1.5} />
        <h2 className="text-lg md:text-xl font-bold text-white">{title}</h2>
        <span className="text-xs text-white/30 ml-2">{movies.length} titles</span>
      </div>
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
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-4 md:px-12 pb-2"
        >
          {movies.map((movie) => {
            const sourceBadge = getSourceBadge(movie.source);
            return (
              <Link
                key={movie.id}
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
                        ? 'bg-[#8B5CF6] text-white'
                        : movie.quality === '1080p'
                        ? 'bg-[#8B5CF6]/70 text-white'
                        : 'bg-white/20 text-white/90 backdrop-blur-sm'
                    }`}>
                      {movie.quality}
                    </span>
                  </div>
                  {/* Source badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded ${sourceBadge.className}`}>
                      {sourceBadge.label}
                    </span>
                  </div>
                  {/* Embeddable/linkout indicator */}
                  <div className="absolute bottom-2 left-2">
                    <span className={`text-[7px] font-medium px-1 py-0.5 rounded ${
                      movie.isEmbeddable
                        ? 'bg-green-500/30 text-green-400'
                        : 'bg-yellow-500/30 text-yellow-400'
                    }`}>
                      {movie.isEmbeddable ? '▶ Play' : '↗ Link'}
                    </span>
                  </div>
                  {/* Rating badge */}
                  {movie.rating > 0 && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      <Star className="w-2.5 h-2.5 text-[#8B5CF6] fill-[#8B5CF6]" strokeWidth={1.5} />
                      {movie.rating}
                    </div>
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 bg-[#8B5CF6]/90 rounded-full flex items-center justify-center shadow-lg">
                      {movie.isEmbeddable ? (
                        <Play className="w-5 h-5 text-black fill-black ml-0.5" strokeWidth={2} />
                      ) : (
                        <ExternalLink className="w-5 h-5 text-black" strokeWidth={2} />
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5">
                  <h3 className="text-sm font-medium text-[#f1f1f4] truncate group-hover/card:text-[#8B5CF6] transition-colors">
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {movie.year > 0 && <span className="text-[11px] text-[#9ca3af]">{movie.year}</span>}
                    {movie.year > 0 && <span className="text-[#1e1e28]">·</span>}
                    <span className="text-[11px] text-[#9ca3af]">{movie.duration}</span>
                  </div>
                  {movie.genres.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {movie.genres.slice(0, 2).map((g) => (
                        <span key={g} className="text-[9px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
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
    </section>
  );
}

/* ─── Search Bar ─── */

function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 md:px-12 mb-6">
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" strokeWidth={1.5} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search free movies..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#0c0c10] border border-[#1e1e28] rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#8B5CF6]/50 focus:ring-1 focus:ring-[#8B5CF6]/20 transition-colors"
        />
      </div>
    </form>
  );
}

/* ─── Main Page ─── */

export default function StreamPage() {
  const [movies, setMovies] = useState<StreamableMovie[]>([]);
  const [categories, setCategories] = useState<StreamingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<StreamableMovie[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch catalog on mount
  useEffect(() => {
    async function fetchCatalog() {
      try {
        const res = await fetch('/api/streaming/catalog');
        if (!res.ok) throw new Error('Failed to fetch catalog');
        const data = await res.json();
        setMovies(data.movies || []);
        setCategories(data.categories || []);
      } catch (err: any) {
        console.error('Failed to load streaming catalog:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCatalog();
  }, []);

  // Search handler
  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults(null);
      setSearchQuery('');
      return;
    }
    setSearchQuery(query);
    try {
      const res = await fetch(`/api/streaming/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  // Get movie objects for a category
  const getCategoryMovies = (cat: StreamingCategory): StreamableMovie[] => {
    return cat.movieIds
      .map(id => movies.find(m => m.id === id))
      .filter((m): m is StreamableMovie => m !== undefined);
  };

  // Featured movie (highest rated 4K movie)
  const featured = movies.filter(m => m.is4K).sort((a, b) => b.rating - a.rating)[0] || movies[0];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#8B5CF6] animate-spin mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-white/60 text-sm">Loading streaming catalog...</p>
        </div>
      </div>
    );
  }

  // Error state (still show something)
  if (error && movies.length === 0) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 text-sm mb-4">Failed to load movies. Using fallback data.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#8B5CF6] text-black rounded-lg text-sm font-medium hover:bg-[#7C3AED] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Compute stats
  const embeddableCount = movies.filter(m => m.isEmbeddable).length;
  const linkoutCount = movies.filter(m => m.videoType === 'linkout').length;
  const blenderCount = movies.filter(m => m.source === 'blender-foundation').length;
  const archiveCount = movies.filter(m => m.source === 'internet-archive' || m.source === 'openflix').length;
  const youtubeCount = movies.filter(m => m.source === 'youtube').length;
  const vimeoCount = movies.filter(m => m.source === 'vimeo-cc').length;
  const tubiCount = movies.filter(m => m.source === 'tubi').length;
  const plutoTVCount = movies.filter(m => m.source === 'pluto-tv').length;
  const bilibiliCount = movies.filter(m => m.source === 'bilibili').length;
  const plexCount = movies.filter(m => m.source === 'plex-free').length;
  const openflixCount = movies.filter(m => m.source === 'openflix').length;
  const animeCount = movies.filter(m => m.genres.some(g => g.toLowerCase().includes('anime'))).length;

  return (
    <div className="min-h-screen bg-[#050507]">
      {/* Hero Banner */}
      {featured && (
        <section className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={featured.backdrop}
              alt={featured.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/90 via-transparent to-transparent" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 px-4 md:px-12 pb-12 md:pb-16">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[#8B5CF6] text-xs font-bold tracking-widest uppercase">StreamFlix</span>
                <span className="w-1 h-1 rounded-full bg-[#8B5CF6]" />
                <span className="text-white/40 text-xs">Free Legal Movies</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 leading-tight">
                {featured.title}
              </h1>

              <div className="flex items-center gap-3 mb-4 flex-wrap">
                {featured.is4K && <span className="text-[#8B5CF6] text-sm font-bold">4K Ultra HD</span>}
                {featured.is4K && <span className="text-white/30">·</span>}
                {featured.year > 0 && <span className="text-white/70 text-sm">{featured.year}</span>}
                {featured.year > 0 && <span className="text-white/30">·</span>}
                <span className="text-white/70 text-sm">{featured.duration}</span>
                {featured.rating > 0 && (
                  <>
                    <span className="text-white/30">·</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-[#8B5CF6] fill-[#8B5CF6]" strokeWidth={1.5} />
                      <span className="text-white/70 text-sm">{featured.rating}</span>
                    </div>
                  </>
                )}
                {featured.genres.slice(0, 3).map((g) => (
                  <span key={g} className="text-[10px] font-medium text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                    {g}
                  </span>
                ))}
              </div>

              <p className="text-white/60 text-sm md:text-base leading-relaxed mb-6 max-w-xl line-clamp-3">
                {featured.description}
              </p>

              <div className="flex items-center gap-3">
                <Link
                  href={`/stream/${encodeURIComponent(featured.id)}`}
                  className="flex items-center gap-2 px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-black font-bold rounded-xl transition-colors shadow-lg shadow-[#8B5CF6]/20"
                >
                  <Play className="w-5 h-5 fill-black" strokeWidth={2} />
                  Play Now
                </Link>
                <Link
                  href={`/stream/${encodeURIComponent(featured.id)}`}
                  className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl transition-colors backdrop-blur-sm border border-white/10"
                >
                  <Info className="w-4 h-4" strokeWidth={1.5} />
                  More Info
                </Link>
              </div>

              <p className="text-white/20 text-[10px] mt-4">
                Source: {featured.source.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} · {featured.sourceLicense}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Page Header */}
      <div className="px-4 md:px-12 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center">
            <Play className="w-5 h-5 text-[#8B5CF6] fill-[#8B5CF6]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">StreamFlix</h2>
            <p className="text-[#9ca3af] text-xs md:text-sm">
              {movies.length} Free Legal Movies · {embeddableCount} Playable · {movies.some(m => m.is4K) ? '4K Available' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <SearchBar onSearch={handleSearch} />

      {/* Search Results */}
      {searchResults !== null && (
        <section className="mb-8">
          <div className="px-4 md:px-12 mb-4">
            <h2 className="text-lg font-bold text-white">
              Search Results for &ldquo;{searchQuery}&rdquo;
              <span className="text-sm font-normal text-white/40 ml-2">({searchResults.length} results)</span>
            </h2>
            {searchResults.length === 0 && (
              <p className="text-white/40 text-sm mt-2">No movies found. Try a different search term.</p>
            )}
          </div>
          {searchResults.length > 0 && (
            <MovieRow
              title="Search Results"
              icon={Search}
              movies={searchResults}
            />
          )}
        </section>
      )}

      {/* Category Rows */}
      {searchResults === null && categories.map((cat) => {
        const catMovies = getCategoryMovies(cat);
        if (catMovies.length === 0) return null;
        const IconComp = CATEGORY_ICONS[cat.icon] || Sparkles;
        return (
          <MovieRow
            key={cat.id}
            title={cat.label}
            icon={IconComp}
            movies={catMovies}
          />
        );
      })}

      {/* Stats footer */}
      <div className="px-4 md:px-12 py-6 border-t border-[#1e1e28]/50">
        <div className="flex items-center gap-4 md:gap-6 text-[10px] text-white/20 flex-wrap">
          <span className="font-medium text-white/30">{movies.length} movies</span>
          <span>{animeCount} anime</span>
          <span>{movies.filter(m => m.is4K).length} in 4K</span>
          <span>{embeddableCount} playable</span>
          <span>{linkoutCount} link-out</span>
          <span className="text-white/10">|</span>
          <span>{blenderCount} Blender CC</span>
          <span>{archiveCount} Archive</span>
          <span>{youtubeCount} YouTube</span>
          <span>{vimeoCount} Vimeo</span>
          <span>{tubiCount} Tubi</span>
          <span>{plutoTVCount} Pluto TV</span>
          <span>{bilibiliCount} Bilibili</span>
          <span>{plexCount} Plex</span>
          <span>{openflixCount} OpenFlix</span>
        </div>
      </div>

      <div className="h-12" />
    </div>
  );
}
