'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Filter, Grid3X3, List, Star, Clock, ChevronDown } from 'lucide-react';
import { movies, genres } from '@/lib/data';
import MovieCard from '@/components/movie/MovieCard';
import { Button } from '@/components/ui/button';

type TimeFilter = 'this-week' | 'this-month' | 'last-3-months' | 'this-year' | 'all';
type SortOption = 'newest' | 'rating' | 'popularity';

export default function NewReleasesPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this-year');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>('newest');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [visibleCount, setVisibleCount] = useState(12);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const now = new Date();
  const filtered = useMemo(() => {
    let result = [...movies];

    // Time filter
    const cutoff = new Date();
    switch (timeFilter) {
      case 'this-week': cutoff.setDate(now.getDate() - 7); break;
      case 'this-month': cutoff.setMonth(now.getMonth() - 1); break;
      case 'last-3-months': cutoff.setMonth(now.getMonth() - 3); break;
      case 'this-year': cutoff.setFullYear(now.getFullYear() - 1); break;
      case 'all': cutoff.setFullYear(1990); break;
    }
    result = result.filter((m) => new Date(m.release_date) >= cutoff);

    // Genre filter
    if (selectedGenres.length > 0) {
      result = result.filter((m) => m.genres.some((g) => selectedGenres.includes(g.name)));
    }

    // Sort
    switch (sort) {
      case 'newest': result.sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime()); break;
      case 'rating': result.sort((a, b) => b.vote_average - a.vote_average); break;
      case 'popularity': result.sort((a, b) => b.vote_count - a.vote_count); break;
    }

    return result;
  }, [timeFilter, selectedGenres, sort]);

  const genreNames = [...new Set(movies.flatMap((m) => m.genres.map((g) => g.name)))];
  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const toggleGenre = (name: string) => {
    setSelectedGenres((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
    setVisibleCount(12);
  };

  const timeLabels: Record<TimeFilter, string> = {
    'this-week': 'This Week',
    'this-month': 'This Month',
    'last-3-months': 'Last 3 Months',
    'this-year': 'This Year',
    'all': 'All Time',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {/* Header */}
        <nav className="flex items-center gap-2 text-sm text-[#6b6b7b] mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#a0a0b0]">New Releases</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-2">New Releases</h1>
            <p className="text-[#6b6b7b]">{filtered.length} movies released {timeLabels[timeFilter].toLowerCase()}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`border-[#2a2a35] bg-transparent text-white hover:bg-[#1a1a25] hover:text-white gap-2 ${filtersOpen ? 'border-[#e50914]' : ''}`}
            >
              <Filter className="w-4 h-4" /> Filters
            </Button>
            <div className="hidden sm:flex items-center border border-[#2a2a35] rounded-lg overflow-hidden">
              <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-[#e50914] text-white' : 'text-[#6b6b7b] hover:text-white'}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-[#e50914] text-white' : 'text-[#6b6b7b] hover:text-white'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Time Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(Object.entries(timeLabels) as [TimeFilter, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => { setTimeFilter(value); setVisibleCount(12); }}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                timeFilter === value
                  ? 'bg-[#e50914] text-white'
                  : 'bg-[#12121a] border border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:border-[#3a3a45]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filters Panel */}
        {filtersOpen && (
          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Filters</h3>
              {selectedGenres.length > 0 && (
                <button onClick={() => { setSelectedGenres([]); setVisibleCount(12); }} className="text-xs text-[#e50914] hover:underline">Clear Genres</button>
              )}
            </div>

            {/* Genres */}
            <div className="mb-5">
              <label className="text-sm font-medium text-[#a0a0b0] mb-3 block">Genres</label>
              <div className="flex flex-wrap gap-2">
                {genreNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => toggleGenre(name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedGenres.includes(name)
                        ? 'bg-[#e50914] text-white'
                        : 'bg-[#0a0a0f] border border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:border-[#3a3a45]'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="text-sm font-medium text-[#a0a0b0] mb-3 block">Sort By</label>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: 'newest', label: 'Newest First' },
                  { value: 'rating', label: 'Highest Rated' },
                  { value: 'popularity', label: 'Most Popular' },
                ] as { value: SortOption; label: string }[]).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSort(value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      sort === value
                        ? 'bg-[#e50914] text-white'
                        : 'bg-[#0a0a0f] border border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:border-[#3a3a45]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {filtered.length > 0 ? (
          <>
            {view === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
                {visible.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {visible.map((movie) => (
                  <Link
                    key={movie.id}
                    href={`/movie/${movie.slug}`}
                    className="flex items-center gap-4 bg-[#12121a] border border-[#2a2a35] rounded-xl p-4 hover:border-[#3a3a45] transition-colors group"
                  >
                    <div className="w-12 h-18 rounded-lg overflow-hidden flex-shrink-0 bg-[#0a0a0f]">
                      <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white group-hover:text-[#e50914] transition-colors truncate">{movie.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#f5c518] font-medium">★ {movie.vote_average.toFixed(1)}</span>
                        <span className="text-xs text-[#6b6b7b] flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(movie.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="text-xs text-[#6b6b7b] flex items-center gap-1"><Clock className="w-3 h-3" /> {movie.runtime}m</span>
                      </div>
                      <div className="flex gap-1.5 mt-1.5">
                        {movie.genres.slice(0, 3).map((g) => (
                          <span key={g.id} className="text-[10px] text-[#6b6b7b] bg-[#0a0a0f] px-1.5 py-0.5 rounded">{g.name}</span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {hasMore && (
              <div className="text-center mt-10">
                <Button
                  onClick={() => setVisibleCount((v) => v + 12)}
                  variant="outline"
                  className="border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:bg-[#1a1a25] hover:border-[#3a3a45] gap-2"
                >
                  <ChevronDown className="w-4 h-4" /> Load More Movies ({filtered.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24">
            <Calendar className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
            <p className="text-lg text-[#a0a0b0] mb-2">No new releases found</p>
            <p className="text-sm text-[#6b6b7b] mb-4">Try adjusting your filters or time range</p>
            <button onClick={() => { setTimeFilter('all'); setSelectedGenres([]); }} className="text-[#e50914] hover:underline">Show all movies</button>
          </div>
        )}
      </div>
    </div>
  );
}
