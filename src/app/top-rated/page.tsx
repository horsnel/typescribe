'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Star, Trophy, Filter, ChevronDown, Grid3X3, List, Crown, Medal } from 'lucide-react';
import { topRated, movies, genres } from '@/lib/data';
import MovieCard from '@/components/movie/MovieCard';
import { Button } from '@/components/ui/button';

type GenreFilter = 'all' | string;

export default function TopRatedPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [genreFilter, setGenreFilter] = useState<GenreFilter>('all');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [visibleCount, setVisibleCount] = useState(20);

  const genreNames = ['all', ...new Set(movies.flatMap((m) => m.genres.map((g) => g.name)))];

  const filtered = useMemo(() => {
    if (genreFilter === 'all') return topRated;
    return topRated.filter(({ movie }) => movie.genres.some((g) => g.name === genreFilter));
  }, [genreFilter]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const rankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-[#f5c518]" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-[#c0c0c0]" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-[#cd7f32]" />;
    return <span className="text-xl font-extrabold text-[#a0a0b0]">#{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <nav className="flex items-center gap-2 text-sm text-[#6b6b7b] mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#a0a0b0]">Top Rated</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-8 h-8 text-[#f5c518]" />
              <h1 className="text-3xl lg:text-4xl font-extrabold text-white">Top Rated Movies</h1>
            </div>
            <p className="text-[#6b6b7b]">{filtered.length} movies ranked by overall rating</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center border border-[#2a2a35] rounded-lg overflow-hidden">
              <button onClick={() => setView('list')} className={`p-2 ${view === 'list' ? 'bg-[#e50914] text-white' : 'text-[#6b6b7b] hover:text-white'}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-[#e50914] text-white' : 'text-[#6b6b7b] hover:text-white'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Genre Filter Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {genreNames.map((name) => (
            <button
              key={name}
              onClick={() => { setGenreFilter(name); setVisibleCount(20); }}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors capitalize ${
                genreFilter === name
                  ? 'bg-[#e50914] text-white'
                  : 'bg-[#12121a] border border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:border-[#3a3a45]'
              }`}
            >
              {name === 'all' ? 'All Genres' : name}
            </button>
          ))}
        </div>

        {/* Top 3 Highlight */}
        {view === 'list' && genreFilter === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {topRated.slice(0, 3).map(({ rank, movie, consensus }) => (
              <Link
                key={movie.id}
                href={`/movie/${movie.slug}`}
                className={`group relative bg-gradient-to-br ${
                  rank === 1 ? 'from-[#f5c518]/10 to-[#f5c518]/5 border-[#f5c518]/30' :
                  rank === 2 ? 'from-[#c0c0c0]/10 to-[#c0c0c0]/5 border-[#c0c0c0]/30' :
                  'from-[#cd7f32]/10 to-[#cd7f32]/5 border-[#cd7f32]/30'
                } border rounded-xl p-5 hover:shadow-xl transition-all`}
              >
                <div className="flex items-center gap-3 mb-3">
                  {rankBadge(rank)}
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-[#f5c518] fill-[#f5c518]" />
                    <span className="text-lg font-bold text-[#f5c518]">{movie.vote_average.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-[#0a0a0f]">
                    <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white group-hover:text-[#e50914] transition-colors leading-snug">{movie.title}</h3>
                    <p className="text-xs text-[#a0a0b0] italic mt-1 line-clamp-2">&ldquo;{consensus}&rdquo;</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] text-[#6b6b7b] bg-[#0a0a0f] px-1.5 py-0.5 rounded">IMDb {movie.imdb_rating}</span>
                      <span className="text-[10px] text-[#6b6b7b] bg-[#0a0a0f] px-1.5 py-0.5 rounded">RT {movie.rotten_tomatoes}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Results */}
        {view === 'list' ? (
          <div className="space-y-3">
            {visible.map(({ rank, movie, consensus }) => (
              <Link key={movie.id} href={`/movie/${movie.slug}`} className="flex items-center gap-6 bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 hover:border-[#3a3a45] hover:shadow-lg transition-all group">
                <div className="w-12 text-center flex-shrink-0">
                  {rank <= 3 ? rankBadge(rank) : <span className="text-xl font-extrabold text-[#6b6b7b]">#{rank}</span>}
                </div>
                <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#0a0a0f]">
                  <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white group-hover:text-[#e50914] transition-colors">{movie.title}</h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <div className="flex items-center gap-1"><Star className="w-4 h-4 text-[#f5c518] fill-[#f5c518]" /><span className="text-sm font-semibold text-[#f5c518]">{movie.vote_average.toFixed(1)}</span></div>
                    <span className="text-xs text-[#6b6b7b]">IMDb {movie.imdb_rating}</span>
                    <span className="text-xs text-[#6b6b7b]">RT {movie.rotten_tomatoes}</span>
                    <span className="text-xs text-[#6b6b7b]">Metacritic {movie.metascore}</span>
                  </div>
                  <p className="text-sm text-[#a0a0b0] italic mt-1 line-clamp-1">&ldquo;{consensus}&rdquo;</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
            {visible.map(({ movie }) => (
              <MovieCard key={movie.id} movie={movie} />
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
              <ChevronDown className="w-4 h-4" /> Show More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
