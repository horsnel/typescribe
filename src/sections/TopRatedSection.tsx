'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Loader2 } from 'lucide-react';
import type { Movie } from '@/lib/types';

const rankColors: Record<number, string> = { 1: 'text-[#D4A853]', 2: 'text-[#c0c0c0]', 3: 'text-[#cd7f32]' };
const rankBgColors: Record<number, string> = { 1: 'bg-[#D4A853]/20', 2: 'bg-[#c0c0c0]/20', 3: 'bg-[#cd7f32]/20' };

export default function TopRatedSection() {
  const [topMovies, setTopMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromAPI, setFromAPI] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/browse?source=top_rated', { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.movies?.length > 0) {
          setTopMovies(data.movies.slice(0, 3));
          setFromAPI(data.fromAPI || false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const displayMovies = topMovies;

  return (
    <section id="top-rated" className="py-12 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="reveal-section text-2xl sm:text-3xl font-bold text-white tracking-tight">Top Rated This Week</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#D4A853] animate-spin" strokeWidth={1.5} />
          </div>
        ) : (
          <div className="card-grid grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayMovies.map((movie, i) => {
              const rank = i + 1;
              return (
                <Link key={movie.id} href={`/movie/${movie.slug}`} className="card-reveal bg-[#0c0c10] border border-white/[0.06] rounded-xl overflow-hidden hover:border-[#D4A853]/30 hover:shadow-xl transition-all group">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img src={movie.backdrop_path?.startsWith('http') ? movie.backdrop_path : movie.backdrop_path?.startsWith('/') ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : movie.poster_path?.startsWith('http') ? movie.poster_path : movie.poster_path?.startsWith('/') ? `https://image.tmdb.org/t/p/w780${movie.poster_path}` : ''} alt={movie.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050507]/60 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3"><span className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${rankBgColors[rank]} backdrop-blur-sm ${rankColors[rank]} text-2xl font-extrabold border-2 ${rank === 1 ? 'border-[#D4A853]' : rank === 2 ? 'border-[#c0c0c0]' : 'border-[#cd7f32]'}`} style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{rank}</span></div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#D4A853] transition-colors">{movie.title}</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1"><Star className="w-4 h-4 text-[#D4A853] fill-[#D4A853]" strokeWidth={1.5} /><span className="text-sm font-semibold text-[#D4A853]">{movie.vote_average.toFixed(1)}</span></div>
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
