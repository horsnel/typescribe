'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Bookmark, Trash2, Grid3X3, List, Star, Clock, Calendar, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useAuth, getLocalWatchlist, toggleWatchlist } from '@/lib/auth';
import { movies } from '@/lib/data';
import MovieCard from '@/components/movie/MovieCard';
import { Button } from '@/components/ui/button';
import { resolveImageUrl, handleImageError } from '@/lib/utils';

type SortOption = 'date-added' | 'rating' | 'release' | 'title';

export default function WatchlistPage() {
  const { user, isAuthenticated } = useAuth();
  const [sort, setSort] = useState<SortOption>('date-added');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [watchlistMovies, setWatchlistMovies] = useState(
    getLocalWatchlist()
      .map((item) => ({ ...movies.find((m) => m.id === item.movieId), addedDate: item.addedDate }))
      .filter((m): m is typeof movies[number] & { addedDate: string } => !!m.id)
  );

  useEffect(() => { document.querySelector('main')?.scrollTo({ top: 0 }) || window.scrollTo(0, 0); }, []);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#9ca3af] mb-4">Please sign in to view your watchlist</p>
          <Link href="/login" className="text-[#d4a853] hover:underline">Sign In</Link>
        </div>
      </div>
    );
  }

  const genreNames = [...new Set(watchlistMovies.flatMap((m) => m.genres.map((g) => g.name)))];

  const filtered = useMemo(() => {
    let result = [...watchlistMovies];
    if (selectedGenres.length > 0) {
      result = result.filter((m) => m.genres.some((g) => selectedGenres.includes(g.name)));
    }
    switch (sort) {
      case 'rating': result.sort((a, b) => b.vote_average - a.vote_average); break;
      case 'release': result.sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime()); break;
      case 'title': result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'date-added': result.sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()); break;
    }
    return result;
  }, [watchlistMovies, selectedGenres, sort]);

  const handleRemove = (movieId: number) => {
    toggleWatchlist(movieId);
    setWatchlistMovies(
      getLocalWatchlist()
        .map((item) => ({ ...movies.find((m) => m.id === item.movieId), addedDate: item.addedDate }))
        .filter((m): m is typeof movies[number] & { addedDate: string } => !!m.id)
    );
  };

  // Stats
  const avgRating = watchlistMovies.length > 0
    ? (watchlistMovies.reduce((sum, m) => sum + m.vote_average, 0) / watchlistMovies.length).toFixed(1)
    : '0';
  const totalRuntime = watchlistMovies.reduce((sum, m) => sum + m.runtime, 0);
  const hours = Math.floor(totalRuntime / 60);
  const mins = totalRuntime % 60;

  return (
    <div className="min-h-screen bg-[#050507] pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <div className="flex items-center gap-3 mb-4">
          <Bookmark className="w-6 h-6 text-[#d4a853]" strokeWidth={1.5} />
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white">My Watchlist</h1>
        </div>

        {/* Stats Row */}
        {watchlistMovies.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
              <Bookmark className="w-5 h-5 text-[#d4a853] mx-auto mb-1" strokeWidth={1.5} />
              <div className="text-xl font-bold text-white">{watchlistMovies.length}</div>
              <div className="text-xs text-[#6b7280]">Movies</div>
            </div>
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
              <Star className="w-5 h-5 text-[#f5c518] mx-auto mb-1" strokeWidth={1.5} />
              <div className="text-xl font-bold text-white">{avgRating}</div>
              <div className="text-xs text-[#6b7280]">Avg Rating</div>
            </div>
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
              <Clock className="w-5 h-5 text-green-400 mx-auto mb-1" strokeWidth={1.5} />
              <div className="text-xl font-bold text-white">{hours}h {mins}m</div>
              <div className="text-xs text-[#6b7280]">Total Runtime</div>
            </div>
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
              <Calendar className="w-5 h-5 text-blue-400 mx-auto mb-1" strokeWidth={1.5} />
              <div className="text-xl font-bold text-white">{new Set(watchlistMovies.flatMap(m => m.genres.map(g => g.name))).size}</div>
              <div className="text-xs text-[#6b7280]">Genres</div>
            </div>
          </div>
        )}

        {/* Controls */}
        {watchlistMovies.length > 0 && (
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex gap-2 items-center">
              {([
                { value: 'date-added', label: 'Recently Added' },
                { value: 'rating', label: 'Rating' },
                { value: 'release', label: 'Release' },
                { value: 'title', label: 'Title' },
              ] as { value: SortOption; label: string }[]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSort(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    sort === value ? 'bg-[#d4a853] text-white' : 'bg-[#0c0c10] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                  }`}
                >
                  {label}
                </button>
              ))}
              {genreNames.length > 1 && (
                <Button variant="outline" onClick={() => setFiltersOpen(!filtersOpen)} className={`border-[#1e1e28] bg-transparent text-[#9ca3af] hover:bg-[#111118] hover:text-white gap-1 text-xs ${filtersOpen ? 'border-[#d4a853]' : ''}`}>
                  <SlidersHorizontal className="w-3 h-3" strokeWidth={1.5} /> Genre
                </Button>
              )}
            </div>
            <div className="flex items-center border border-[#1e1e28] rounded-lg overflow-hidden">
              <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-[#d4a853] text-white' : 'text-[#6b7280] hover:text-white'}`}>
                <Grid3X3 className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-[#d4a853] text-white' : 'text-[#6b7280] hover:text-white'}`}>
                <List className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {/* Genre Filter */}
        {filtersOpen && genreNames.length > 0 && (
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 mb-6">
            <div className="flex flex-wrap gap-2">
              {genreNames.map((name) => (
                <button
                  key={name}
                  onClick={() => setSelectedGenres(prev => prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name])}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedGenres.includes(name) ? 'bg-[#d4a853] text-white' : 'bg-[#050507] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Movies */}
        {watchlistMovies.length > 0 ? (
          filtered.length > 0 ? (
            view === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((movie) => (
                  <div key={movie.id} className="relative group">
                    <MovieCard movie={movie} />
                    <button
                      onClick={() => handleRemove(movie.id)}
                      className="absolute top-2 right-2 z-10 p-1.5 bg-[#050507]/80 rounded-full text-[#6b7280] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((movie) => (
                  <div key={movie.id} className="flex items-center gap-4 bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 group hover:border-[#3a3a45] transition-colors">
                    <Link href={`/movie/${movie.slug}`} className="w-12 h-18 rounded-lg overflow-hidden flex-shrink-0 bg-[#050507]">
                      <img src={resolveImageUrl(movie.poster_path, 'w500')} alt={movie.title} className="w-full h-full object-cover" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/movie/${movie.slug}`}>
                        <h3 className="text-sm font-semibold text-white group-hover:text-[#d4a853] transition-colors truncate">{movie.title}</h3>
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#f5c518] font-medium">★ {movie.vote_average.toFixed(1)}</span>
                        <span className="text-xs text-[#6b7280]">{movie.release_date.split('-')[0]}</span>
                        <span className="text-xs text-[#6b7280]">{movie.runtime}m</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(movie.id)}
                      className="p-2 text-[#6b7280] hover:text-red-400 transition-colors flex-shrink-0"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-16">
              <p className="text-[#9ca3af] mb-2">No movies match your filter</p>
              <button onClick={() => setSelectedGenres([])} className="text-[#d4a853] hover:underline">Clear genre filter</button>
            </div>
          )
        ) : (
          <div className="text-center py-24">
            <Bookmark className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-lg text-[#9ca3af] mb-2">Your watchlist is empty</p>
            <p className="text-sm text-[#6b7280] mb-4">Start adding movies you want to watch</p>
            <Link href="/browse" className="text-[#d4a853] hover:underline">Browse Movies</Link>
          </div>
        )}
      </div>
    </div>
  );
}
