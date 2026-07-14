'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Play, Search, Star, Clock, Filter, Loader2, Film } from 'lucide-react';
import type { StreamableMovie } from '@/lib/streaming-pipeline/types';

const SOURCES = [
  { id: 'all', label: 'All Sources' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'internet-archive', label: 'Archive.org' },
  { id: 'blender-foundation', label: 'Blender' },
  { id: 'tubi', label: 'Tubi' },
  { id: 'pluto-tv', label: 'Pluto TV' },
  { id: 'bilibili', label: 'Bilibili' },
  { id: 'openflix', label: 'OpenFlix' },
  { id: 'crunchyroll', label: 'Crunchyroll' },
  { id: 'crackle', label: 'Crackle' },
  { id: 'plex-free', label: 'Plex' },
  { id: 'vimeo-cc', label: 'Vimeo' },
  { id: 'retrocrush', label: 'RetroCrush' },
  { id: 'contv', label: 'CONtv' },
];

const SORTS = [
  { id: 'newest', label: 'Newest Added' },
  { id: 'rating', label: 'Highest Rated' },
  { id: 'title', label: 'A-Z' },
  { id: 'year', label: 'Year' },
];

export default function StreamPage() {
  const [movies, setMovies] = useState<StreamableMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [sort, setSort] = useState('newest');
  const [visible, setVisible] = useState(60);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/streaming/catalog?moviesOnly=true');
        const data = await res.json();
        setMovies(data.movies ?? []);
      } catch (e) {
        console.error('Failed to load catalog:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let r = [...movies];
    if (query) {
      const q = query.toLowerCase();
      r = r.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.genres.some(g => g.toLowerCase().includes(q)),
      );
    }
    if (source !== 'all') {
      r = r.filter(m => m.source === source);
    }
    switch (sort) {
      case 'rating': r.sort((a, b) => b.rating - a.rating); break;
      case 'title':  r.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'year':   r.sort((a, b) => b.year - a.year); break;
      default:       r.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    }
    return r;
  }, [movies, query, source, sort]);

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-[#1e1e28]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4A853]/10 via-transparent to-[#D4A853]/5" />
        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4A853]/15 border border-[#D4A853]/30 rounded-full mb-4">
            <Play className="w-3.5 h-3.5 text-[#D4A853]" />
            <span className="text-xs font-medium text-[#D4A853] uppercase tracking-wide">Free · Legal · Streaming</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">Watch Now</h1>
          <p className="text-[#9ca3af] text-base md:text-lg max-w-2xl">
            {movies.length > 0
              ? `${movies.length} movies and shows from 14+ free streaming sources. No subscription required.`
              : 'Loading the catalog from 14+ streaming sources…'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="sticky top-0 z-30 bg-[#050507]/95 backdrop-blur-md border-b border-[#1e1e28]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search titles, genres…"
              className="w-full pl-10 pr-4 py-2.5 bg-[#0c0c10] border border-[#1e1e28] rounded-full text-sm text-white placeholder:text-[#5b5b6b] focus:outline-none focus:border-[#D4A853]/50"
            />
          </div>
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            className="px-3 py-2.5 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-white focus:outline-none focus:border-[#D4A853]/50"
          >
            {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="px-3 py-2.5 bg-[#0c0c10] border border-[#1e1e28] rounded-lg text-sm text-white focus:outline-none focus:border-[#D4A853]/50"
          >
            {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-[#D4A853] animate-spin mb-4" />
            <p className="text-[#9ca3af] text-sm">Loading catalog from 14+ sources…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Film className="w-12 h-12 text-[#5b5b6b] mb-4" />
            <p className="text-[#9ca3af]">No movies match your filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filtered.slice(0, visible).map(movie => (
                <Link
                  key={movie.id}
                  href={`/stream/${encodeURIComponent(movie.id)}`}
                  className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-[#0c0c10] border border-[#1e1e28] hover:border-[#D4A853]/50 transition-all"
                >
                  {movie.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Film className="w-8 h-8 text-[#5b5b6b]" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-90" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-medium uppercase text-[#D4A853] bg-[#D4A853]/10 px-1.5 py-0.5 rounded">
                        {movie.source}
                      </span>
                    </div>
                    <h3 className="text-xs font-semibold text-white line-clamp-2 mb-1">
                      {movie.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-[#9ca3af]">
                      {movie.rating > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-[#D4A853] text-[#D4A853]" />
                          {movie.rating.toFixed(1)}
                        </span>
                      )}
                      {movie.duration && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />{movie.duration}
                        </span>
                      )}
                      {movie.year > 0 && <span>{movie.year}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {visible < filtered.length && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setVisible(v => v + 60)}
                  className="px-6 py-2.5 bg-[#D4A853]/10 border border-[#D4A853]/30 rounded-lg text-sm text-[#D4A853] hover:bg-[#D4A853]/20 transition"
                >
                  Load more ({filtered.length - visible} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
