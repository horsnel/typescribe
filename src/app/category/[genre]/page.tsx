'use client';
import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Star, Grid3X3, List, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { getMoviesByGenre, genres, movies } from '@/lib/data';
import MovieCard from '@/components/movie/MovieCard';
import { Button } from '@/components/ui/button';

type SortOption = 'rating' | 'release' | 'title' | 'popularity';

export default function CategoryPage({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = React.use(params);
  const genreData = genres.find((g) => g.id === genre);
  const genreMovies = getMoviesByGenre(genreData?.name || genre);
  const displayName = genreData?.name || genre;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [sort, setSort] = useState<SortOption>('rating');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [visibleCount, setVisibleCount] = useState(12);

  // Get related genres
  const relatedGenres = useMemo(() => {
    const genreCounts: Record<string, number> = {};
    genreMovies.forEach((m) => {
      m.genres.forEach((g) => {
        if (g.name !== displayName) {
          genreCounts[g.name] = (genreCounts[g.name] || 0) + 1;
        }
      });
    });
    return Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => genres.find((g) => g.name === name))
      .filter(Boolean);
  }, [genreMovies, displayName]);

  // Stats
  const avgRating = genreMovies.length > 0
    ? (genreMovies.reduce((sum, m) => sum + m.vote_average, 0) / genreMovies.length).toFixed(1)
    : '0';
  const newestMovie = genreMovies.length > 0
    ? [...genreMovies].sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime())[0]
    : null;
  const highestRated = genreMovies.length > 0
    ? [...genreMovies].sort((a, b) => b.vote_average - a.vote_average)[0]
    : null;

  const sorted = useMemo(() => {
    const result = [...genreMovies];
    switch (sort) {
      case 'rating': result.sort((a, b) => b.vote_average - a.vote_average); break;
      case 'release': result.sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime()); break;
      case 'title': result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'popularity': result.sort((a, b) => b.vote_count - a.vote_count); break;
    }
    return result;
  }, [genreMovies, sort]);

  const visible = sorted.slice(0, visibleCount);
  const hasMore = sorted.length > visibleCount;

  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#6b7280] mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <Link href="/browse" className="hover:text-white transition-colors">Browse</Link>
          <span>/</span>
          <span className="text-[#9ca3af]">{displayName}</span>
        </nav>

        {/* Hero Banner */}
        <div className="relative bg-gradient-to-r from-[#e50914]/20 to-[#b20710]/5 border border-[#e50914]/20 rounded-2xl p-8 mb-8 overflow-hidden">
          <div className="absolute right-0 top-0 w-1/2 h-full opacity-10">
            {newestMovie && (
              <img src={newestMovie.backdrop_path} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-2">{displayName} Movies</h1>
            <p className="text-[#9ca3af] mb-6">{genreMovies.length} movies in this category</p>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#050507]/50 backdrop-blur-sm rounded-lg p-3 border border-[#1e1e28]/50">
                <p className="text-xs text-[#6b7280]">Total Movies</p>
                <p className="text-xl font-bold text-white">{genreMovies.length}</p>
              </div>
              <div className="bg-[#050507]/50 backdrop-blur-sm rounded-lg p-3 border border-[#1e1e28]/50">
                <p className="text-xs text-[#6b7280]">Avg Rating</p>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-[#f5c518] fill-[#f5c518]" />
                  <p className="text-xl font-bold text-[#f5c518]">{avgRating}</p>
                </div>
              </div>
              <div className="bg-[#050507]/50 backdrop-blur-sm rounded-lg p-3 border border-[#1e1e28]/50">
                <p className="text-xs text-[#6b7280]">Highest Rated</p>
                <p className="text-sm font-bold text-white truncate">{highestRated?.title || 'N/A'}</p>
              </div>
              <div className="bg-[#050507]/50 backdrop-blur-sm rounded-lg p-3 border border-[#1e1e28]/50">
                <p className="text-xs text-[#6b7280]">Newest</p>
                <p className="text-sm font-bold text-white truncate">{newestMovie?.title || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          {/* Main Content */}
          <div>
            {/* Sort & View Controls */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className="flex gap-2">
                {([
                  { value: 'rating', label: 'Rating' },
                  { value: 'release', label: 'Newest' },
                  { value: 'title', label: 'Title' },
                  { value: 'popularity', label: 'Popular' },
                ] as { value: SortOption; label: string }[]).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSort(value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      sort === value ? 'bg-[#e50914] text-white' : 'bg-[#0c0c10] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center border border-[#1e1e28] rounded-lg overflow-hidden">
                <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-[#e50914] text-white' : 'text-[#6b7280] hover:text-white'}`}>
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-[#e50914] text-white' : 'text-[#6b7280] hover:text-white'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Movie Grid / List */}
            {genreMovies.length > 0 ? (
              <>
                {view === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
                    {visible.map((movie) => <MovieCard key={movie.id} movie={movie} />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visible.map((movie) => (
                      <Link key={movie.id} href={`/movie/${movie.slug}`} className="flex items-center gap-4 bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 hover:border-[#3a3a45] transition-colors group">
                        <div className="w-12 h-18 rounded-lg overflow-hidden flex-shrink-0 bg-[#050507]">
                          <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white group-hover:text-[#e50914] transition-colors truncate">{movie.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[#f5c518] font-medium">★ {movie.vote_average.toFixed(1)}</span>
                            <span className="text-xs text-[#6b7280]">{movie.release_date.split('-')[0]}</span>
                            <span className="text-xs text-[#6b7280]">{movie.runtime}m</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {hasMore && (
                  <div className="text-center mt-10">
                    <Button onClick={() => setVisibleCount((v) => v + 12)} variant="outline" className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#111118] gap-2">
                      <ChevronDown className="w-4 h-4" /> Load More
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-24">
                <p className="text-lg text-[#9ca3af] mb-2">No movies found in this category</p>
                <Link href="/browse" className="text-[#e50914] hover:underline">Browse all movies</Link>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Related Genres */}
            {relatedGenres.length > 0 && (
              <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
                <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">Related Genres</h3>
                <div className="space-y-2">
                  {relatedGenres.map((g) => g && (
                    <Link key={g.id} href={`/category/${g.id}`} className="flex items-center justify-between p-2.5 bg-[#050507] border border-[#1e1e28] rounded-lg hover:border-[#3a3a45] transition-colors group">
                      <span className="text-sm text-[#9ca3af] group-hover:text-white transition-colors">{g.name}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#6b7280] group-hover:text-[#e50914] transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* All Genres */}
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
              <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">All Categories</h3>
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => (
                  <Link
                    key={g.id}
                    href={`/category/${g.id}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      g.id === genre ? 'bg-[#e50914] text-white' : 'bg-[#050507] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                    }`}
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
