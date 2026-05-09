'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Filter, Grid3X3, List, Star, Clock, ChevronDown, Loader2, Film, Tv, Sparkles } from 'lucide-react';
import MovieCard from '@/components/movie/MovieCard';
import { Button } from '@/components/ui/button';
import type { Movie } from '@/lib/types';
import { resolveImageUrl, handleImageError } from '@/lib/utils';

type MediaType = 'movie' | 'tv' | 'all';
type TimeFilter = 'next-30' | 'next-90' | 'this-year' | 'all';
type SortOption = 'release_date' | 'popularity' | 'rating';

export default function UpcomingPage() {
  useEffect(() => { document.querySelector('main')?.scrollTo({ top: 0 }) || window.scrollTo(0, 0); }, []);

  const [mediaType, setMediaType] = useState<MediaType>('movie');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('next-90');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>('release_date');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [visibleCount, setVisibleCount] = useState(12);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [apiMovies, setApiMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch upcoming movies from API
  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();

    const sortMap: Record<SortOption, string> = {
      'release_date': 'primary_release_date.asc',
      'popularity': 'popularity.desc',
      'rating': 'vote_average.desc',
    };

    // Calculate future date range for upcoming
    const now = new Date();
    const yearFrom = now.getFullYear();
    let yearTo = now.getFullYear() + 2;
    switch (timeFilter) {
      case 'next-30': yearTo = now.getFullYear(); break;
      case 'next-90': yearTo = now.getFullYear(); break;
      case 'this-year': yearTo = now.getFullYear(); break;
      case 'all': yearTo = now.getFullYear() + 5; break;
    }

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    let url: string;
    if (mediaType === 'movie') {
      url = `/api/browse?sort=${sortMap[sort]}&yearFrom=${yearFrom}&yearTo=${yearTo}&page=1&source=upcoming`;
    } else if (mediaType === 'tv') {
      url = `/api/browse?format=tv&sort=${sortMap[sort]}&yearFrom=${yearFrom}&yearTo=${yearTo}&page=1`;
    } else {
      url = `/api/browse?sort=${sortMap[sort]}&yearFrom=${yearFrom}&yearTo=${yearTo}&page=1&source=upcoming`;
    }

    fetch(url, { cache: 'no-store', signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.movies?.length > 0) {
          // Filter to only show unreleased (future release dates)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const upcoming = data.movies.filter((m: Movie) => {
            if (!m.release_date) return true; // Include if no date (likely unreleased)
            const releaseDate = new Date(m.release_date);
            return releaseDate >= today;
          });
          setApiMovies(upcoming.length > 0 ? upcoming : data.movies);
        } else {
          setApiMovies([]);
        }
      })
      .catch(() => { setApiMovies([]); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [mediaType, timeFilter, sort]);

  const genreNames = useMemo(() => {
    const allGenres = apiMovies.flatMap((m) => m.genres.map(g => g.name)).filter(Boolean);
    return [...new Set(allGenres)];
  }, [apiMovies]);

  const filtered = useMemo(() => {
    let result = [...apiMovies];

    // Genre filter
    if (selectedGenres.length > 0) {
      result = result.filter((m) => m.genres.some((g) => selectedGenres.includes(g.name)));
    }

    // Client-side time filter for upcoming
    if (timeFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      switch (timeFilter) {
        case 'next-30': cutoff.setDate(now.getDate() + 30); break;
        case 'next-90': cutoff.setDate(now.getDate() + 90); break;
        case 'this-year': cutoff.setFullYear(now.getFullYear(), 11, 31); break;
      }
      result = result.filter((m) => {
        if (!m.release_date) return true;
        return new Date(m.release_date) <= cutoff;
      });
    }

    return result;
  }, [apiMovies, selectedGenres, timeFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const toggleGenre = (name: string) => {
    setSelectedGenres((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
    setVisibleCount(12);
  };

  const timeLabels: Record<TimeFilter, string> = {
    'next-30': 'Next 30 Days',
    'next-90': 'Next 3 Months',
    'this-year': 'This Year',
    'all': 'All Upcoming',
  };

  // Helper to format release date with countdown
  const getReleaseInfo = (dateStr: string) => {
    if (!dateStr) return { display: 'TBA', countdown: '' };
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const display = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (diff > 0) {
      return { display, countdown: `${diff}d away` };
    } else if (diff === 0) {
      return { display, countdown: 'Today!' };
    } else {
      return { display, countdown: '' };
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#D4A853]/10 border border-[#D4A853]/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-white">Upcoming</h1>
            </div>
            <p className="text-[#6b7280]">{filtered.length} movies & series yet to be released</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`border-[#1e1e28] bg-transparent text-white hover:bg-[#111118] hover:text-white gap-2 ${filtersOpen ? 'border-[#D4A853]' : ''}`}
            >
              <Filter className="w-4 h-4" strokeWidth={1.5} /> Filters
            </Button>
            <div className="hidden sm:flex items-center border border-[#1e1e28] rounded-lg overflow-hidden">
              <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-[#D4A853] text-white' : 'text-[#6b7280] hover:text-white'}`}>
                <Grid3X3 className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-[#D4A853] text-white' : 'text-[#6b7280] hover:text-white'}`}>
                <List className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Media Type Tabs */}
        <div className="flex gap-2 mb-4">
          {([
            { value: 'movie' as MediaType, label: 'Movies', icon: Film },
            { value: 'tv' as MediaType, label: 'TV Series', icon: Tv },
            { value: 'all' as MediaType, label: 'All', icon: Sparkles },
          ]).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => { setMediaType(value); setVisibleCount(12); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                mediaType === value
                  ? 'bg-[#D4A853] text-white'
                  : 'bg-[#0c0c10] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>

        {/* Time Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(Object.entries(timeLabels) as [TimeFilter, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => { setTimeFilter(value); setVisibleCount(12); }}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                timeFilter === value
                  ? 'bg-[#D4A853] text-white'
                  : 'bg-[#0c0c10] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filters Panel */}
        {filtersOpen && (
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Filters</h3>
              {selectedGenres.length > 0 && (
                <button onClick={() => { setSelectedGenres([]); setVisibleCount(12); }} className="text-xs text-[#D4A853] hover:underline">Clear Genres</button>
              )}
            </div>

            {/* Genres */}
            {genreNames.length > 0 && (
              <div className="mb-5">
                <label className="text-sm font-medium text-[#9ca3af] mb-3 block">Genres</label>
                <div className="flex flex-wrap gap-2">
                  {genreNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => toggleGenre(name)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedGenres.includes(name)
                          ? 'bg-[#D4A853] text-white'
                          : 'bg-[#050507] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sort */}
            <div>
              <label className="text-sm font-medium text-[#9ca3af] mb-3 block">Sort By</label>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: 'release_date', label: 'Release Date' },
                  { value: 'popularity', label: 'Most Anticipated' },
                  { value: 'rating', label: 'Highest Rated' },
                ] as { value: SortOption; label: string }[]).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSort(value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      sort === value
                        ? 'bg-[#D4A853] text-white'
                        : 'bg-[#050507] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-[#D4A853] animate-spin" strokeWidth={1.5} />
            <span className="ml-3 text-[#6b7280]">Loading upcoming releases...</span>
          </div>
        ) : filtered.length > 0 ? (
          <>
            {view === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
                {visible.map((movie) => {
                  const releaseInfo = getReleaseInfo(movie.release_date);
                  return (
                    <div key={movie.id} className="relative group">
                      <MovieCard movie={movie} />
                      {/* Upcoming badge */}
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                        <span className="text-[10px] font-bold bg-[#D4A853] text-white px-2 py-0.5 rounded-full shadow-lg">
                          UPCOMING
                        </span>
                        {releaseInfo.countdown && (
                          <span className="text-[10px] font-medium bg-black/80 text-[#D4A853] px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm">
                            {releaseInfo.countdown}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {visible.map((movie) => {
                  const releaseInfo = getReleaseInfo(movie.release_date);
                  return (
                    <Link
                      key={movie.id}
                      href={`/movie/${movie.slug}`}
                      className="flex items-center gap-4 bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 hover:border-[#3a3a45] transition-colors group"
                    >
                      <div className="w-12 h-18 rounded-lg overflow-hidden flex-shrink-0 bg-[#050507] relative">
                        <img src={resolveImageUrl(movie.poster_path, 'w500')} alt={movie.title} className="w-full h-full object-cover" />
                        <div className="absolute top-0 left-0 right-0 bg-[#D4A853] text-[8px] font-bold text-white text-center py-0.5">UPCOMING</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white group-hover:text-[#D4A853] transition-colors truncate">{movie.title}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-[#D4A853] font-medium flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" strokeWidth={1.5} /> {releaseInfo.display}
                          </span>
                          {releaseInfo.countdown && (
                            <span className="text-[10px] bg-[#D4A853]/10 text-[#D4A853] px-1.5 py-0.5 rounded-full font-medium">
                              {releaseInfo.countdown}
                            </span>
                          )}
                          {movie.vote_average > 0 && (
                            <span className="text-xs text-[#D4A853] font-medium flex items-center gap-0.5"><Star className="w-3 h-3 fill-[#D4A853]" strokeWidth={0} /> {movie.vote_average.toFixed(1)}</span>
                          )}
                        </div>
                        <div className="flex gap-1.5 mt-1.5">
                          {movie.genres.slice(0, 3).map((g) => (
                            <span key={g.id} className="text-[10px] text-[#6b7280] bg-[#050507] px-1.5 py-0.5 rounded">{g.name}</span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {hasMore && (
              <div className="text-center mt-10">
                <Button
                  onClick={() => setVisibleCount((v) => v + 12)}
                  variant="outline"
                  className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#111118] hover:border-[#3a3a45] gap-2"
                >
                  <ChevronDown className="w-4 h-4" strokeWidth={1.5} /> Load More
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24">
            <Calendar className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-lg text-[#9ca3af] mb-2">No upcoming releases found</p>
            <p className="text-sm text-[#6b7280] mb-4">Try adjusting your filters or time range</p>
            <button onClick={() => { setTimeFilter('all'); setSelectedGenres([]); }} className="text-[#D4A853] hover:underline">Show all upcoming</button>
          </div>
        )}
      </div>
    </div>
  );
}
