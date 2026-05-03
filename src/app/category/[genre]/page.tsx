'use client';
import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Star, Grid3X3, List, ChevronDown, Loader2 } from 'lucide-react';
import MovieCard from '@/components/movie/MovieCard';
import { Button } from '@/components/ui/button';
import type { Movie } from '@/lib/types';

type SortOption = 'rating' | 'release' | 'title' | 'popularity';

// TMDb genre map for slug → ID resolution
const TMDB_GENRE_MAP: Record<string, { id: number; name: string }> = {
  'action': { id: 28, name: 'Action' },
  'adventure': { id: 12, name: 'Adventure' },
  'animation': { id: 16, name: 'Animation' },
  'comedy': { id: 35, name: 'Comedy' },
  'crime': { id: 80, name: 'Crime' },
  'documentary': { id: 99, name: 'Documentary' },
  'drama': { id: 18, name: 'Drama' },
  'family': { id: 10751, name: 'Family' },
  'fantasy': { id: 14, name: 'Fantasy' },
  'history': { id: 36, name: 'History' },
  'horror': { id: 27, name: 'Horror' },
  'music': { id: 10402, name: 'Music' },
  'mystery': { id: 9648, name: 'Mystery' },
  'romance': { id: 10749, name: 'Romance' },
  'science-fiction': { id: 878, name: 'Science Fiction' },
  'sci-fi': { id: 878, name: 'Sci-Fi' },
  'tv-movie': { id: 10770, name: 'TV Movie' },
  'thriller': { id: 53, name: 'Thriller' },
  'war': { id: 10752, name: 'War' },
  'western': { id: 37, name: 'Western' },
  'bollywood': { id: 0, name: 'Bollywood' },  // Special: uses country filter instead
  'korean': { id: 0, name: 'K-Drama & K-Movie' },  // Special: uses country filter instead
  'nollywood': { id: 0, name: 'Nollywood' },  // Special: uses country filter instead
  'anime-genre': { id: 16, name: 'Anime' },  // Animation genre
};

// All genres for sidebar
const ALL_GENRES = Object.entries(TMDB_GENRE_MAP).map(([slug, data]) => ({
  id: slug,
  name: data.name,
  tmdbId: data.id,
}));

export default function CategoryPage({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = React.use(params);
  const genreInfo = TMDB_GENRE_MAP[genre];
  const displayName = genreInfo?.name || genre.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const [genreMovies, setGenreMovies] = useState<Movie[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>('popularity');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(() => { document.querySelector('main')?.scrollTo({ top: 0 }) || window.scrollTo(0, 0); }, [genre]);

  // Fetch movies from TMDb discover API
  useEffect(() => {
    if (!genreInfo) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const sortMap: Record<SortOption, string> = {
      popularity: 'popularity.desc',
      rating: 'vote_average.desc',
      release: 'primary_release_date.desc',
      title: 'original_title.asc',
    };

    let url: string;
    if (genreInfo.id === 0) {
      // Country-based genre
      const countryMap: Record<string, string> = {
        'bollywood': 'IN',
        'korean': 'KR',
        'nollywood': 'NG',
      };
      const countryCode = countryMap[genre];
      if (!countryCode) { setLoading(false); return; }
      url = `/api/browse?format=movie&country=${countryCode}&sort=${sortMap[sort]}&page=${currentPage}&minRating=5`;
    } else {
      url = `/api/browse?format=movie&genres=${genreInfo.id}&sort=${sortMap[sort]}&page=${currentPage}&minRating=5`;
    }

    fetch(url)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.movies) {
          setGenreMovies(data.movies);
          setTotalResults(data.totalResults || data.movies.length);
          setTotalPages(data.totalPages || 1);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [genre, sort, currentPage, genreInfo]);

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

  // Get related genres based on what appears alongside this genre
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
      .map(([name]) => ALL_GENRES.find(g => g.name === name))
      .filter(Boolean);
  }, [genreMovies, displayName]);

  return (
    <div className="min-h-screen bg-[#050507] pt-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {/* Hero Banner */}
        <div className="relative bg-gradient-to-r from-[#8B5CF6]/20 to-[#8B5CF6]/5 border border-[#8B5CF6]/20 rounded-2xl p-8 mb-8 overflow-hidden">
          <div className="absolute right-0 top-0 w-1/2 h-full opacity-10">
            {newestMovie && newestMovie.backdrop_path && (
              <img src={newestMovie.backdrop_path?.startsWith('/') ? `https://image.tmdb.org/t/p/w780${newestMovie.backdrop_path}` : newestMovie.backdrop_path} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-2">{displayName} Movies</h1>
            <p className="text-[#9ca3af] mb-6">{totalResults.toLocaleString()} movies in this category</p>

            {/* Stats Row - horizontal inline */}
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <span className="text-xs text-[#6b7280]">Total Movies</span>
                <span className="text-sm font-bold text-white ml-2">{totalResults.toLocaleString()}</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#6b7280]">Avg Rating</span>
                <Star className="w-3.5 h-3.5 text-[#8B5CF6] fill-[#8B5CF6] ml-2" strokeWidth={1.5} />
                <span className="text-sm font-bold text-[#8B5CF6]">{avgRating}</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div>
                <span className="text-xs text-[#6b7280]">Highest rated</span>
                <span className="text-sm font-bold text-white ml-2">{highestRated?.title || 'N/A'}</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div>
                <span className="text-xs text-[#6b7280]">Newest</span>
                <span className="text-sm font-bold text-white ml-2">{newestMovie?.title || 'N/A'}</span>
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
                  { value: 'popularity', label: 'Popular' },
                  { value: 'rating', label: 'Rating' },
                  { value: 'release', label: 'Newest' },
                  { value: 'title', label: 'Title' },
                ] as { value: SortOption; label: string }[]).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => { setSort(value); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      sort === value ? 'bg-[#8B5CF6] text-white' : 'bg-[#0c0c10] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center border border-[#1e1e28] rounded-lg overflow-hidden">
                <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-[#8B5CF6] text-white' : 'text-[#6b7280] hover:text-white'}`}>
                  <Grid3X3 className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-[#8B5CF6] text-white' : 'text-[#6b7280] hover:text-white'}`}>
                  <List className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" strokeWidth={1.5} />
              </div>
            ) : genreMovies.length > 0 ? (
              <>
                {view === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
                    {genreMovies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {genreMovies.map((movie) => (
                      <Link key={movie.id} href={`/movie/${movie.slug}`} className="flex items-center gap-4 bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 hover:border-[#3a3a45] transition-colors group">
                        <div className="w-12 h-18 rounded-lg overflow-hidden flex-shrink-0 bg-[#050507]">
                          <img src={movie.poster_path?.startsWith('/') ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` : movie.poster_path} alt={movie.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white group-hover:text-[#8B5CF6] transition-colors truncate">{movie.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[#8B5CF6] font-medium">★ {movie.vote_average.toFixed(1)}</span>
                            <span className="text-xs text-[#6b7280]">{movie.release_date?.split('-')[0]}</span>
                            {movie.runtime > 0 && <span className="text-xs text-[#6b7280]">{movie.runtime}m</span>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-10">
                    <Button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#111118]"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-[#6b7280]">Page {currentPage} of {Math.min(totalPages, 500)}</span>
                    <Button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      variant="outline"
                      className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#111118]"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-24">
                <p className="text-lg text-[#9ca3af] mb-2">No movies found in this category</p>
                <Link href="/browse" className="text-[#8B5CF6] hover:underline">Browse all movies</Link>
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
                      <ArrowRight className="w-3.5 h-3.5 text-[#6b7280] group-hover:text-[#8B5CF6] transition-colors" strokeWidth={1.5} />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* All Genres */}
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
              <h3 className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-4">All Categories</h3>
              <div className="flex flex-wrap gap-2">
                {ALL_GENRES.map((g) => (
                  <Link
                    key={g.id}
                    href={`/category/${g.id}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      g.id === genre ? 'bg-[#8B5CF6] text-white' : 'bg-[#050507] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
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
