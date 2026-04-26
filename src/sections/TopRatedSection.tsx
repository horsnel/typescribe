'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Loader2 } from 'lucide-react';
import { topRated } from '@/lib/data';
import type { Movie } from '@/lib/types';

const rankColors: Record<number, string> = { 1: 'text-[#f5c518]', 2: 'text-[#c0c0c0]', 3: 'text-[#cd7f32]' };
const rankBgColors: Record<number, string> = { 1: 'bg-[#f5c518]/20', 2: 'bg-[#c0c0c0]/20', 3: 'bg-[#cd7f32]/20' };

export default function TopRatedSection() {
  const [topMovies, setTopMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromAPI, setFromAPI] = useState(false);

  useEffect(() => {
    fetch('/api/browse?source=top_rated&count=3')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.movies?.length > 0 && data.fromAPI) {
          setTopMovies(data.movies.slice(0, 3));
          setFromAPI(true);
        } else {
          setTopMovies(topRated.map(t => t.movie));
        }
      })
      .catch(() => setTopMovies(topRated.map(t => t.movie)))
      .finally(() => setLoading(false));
  }, []);

  const displayMovies = topMovies.length > 0 ? topMovies : topRated.map(t => t.movie);

  return (
    <section id="top-rated" className="py-20 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex items-center gap-3 mb-10">
          <h2 className="reveal-section text-2xl sm:text-3xl font-bold text-white tracking-tight">Top Rated This Week</h2>
          {fromAPI && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Live</span>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#e50914] animate-spin" />
          </div>
        ) : (
          <div className="card-grid grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayMovies.map((movie, i) => {
              const rank = i + 1;
              return (
                <Link key={movie.id} href={`/movie/${movie.slug}`} className="card-reveal bg-[#0c0c10] border border-white/[0.06] rounded-xl overflow-hidden hover:border-[#e50914]/30 hover:shadow-xl transition-all group">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050507]/60 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3"><span className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${rankBgColors[rank]} backdrop-blur-sm ${rankColors[rank]} text-2xl font-extrabold border-2 ${rank === 1 ? 'border-[#f5c518]' : rank === 2 ? 'border-[#c0c0c0]' : 'border-[#cd7f32]'}`} style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>#{rank}</span></div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#e50914] transition-colors">{movie.title}</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1"><Star className="w-4 h-4 text-[#f5c518] fill-[#f5c518]" /><span className="text-sm font-semibold text-[#f5c518]">{movie.vote_average.toFixed(1)}</span></div>
                      {movie.imdb_rating && <span className="text-xs text-[#6b7280]">IMDb {movie.imdb_rating}</span>}
                      {movie.rotten_tomatoes && <span className="text-xs text-[#6b7280]">RT {movie.rotten_tomatoes}</span>}
                    </div>
                    {movie.rt_consensus && <p className="text-sm text-[#9ca3af] italic leading-relaxed">&ldquo;{movie.rt_consensus}&rdquo;</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
