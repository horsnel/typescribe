'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { Movie } from '@/lib/types';

export default function LatestReviews() {
  const [reviewMovies, setReviewMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/browse?source=trending', { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.movies && data.movies.length > 0) {
          setReviewMovies(data.movies.slice(0, 6));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <section className="py-20 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="reveal-section flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Latest AI Reviews</h2>
            <span className="flex items-center gap-1 text-xs bg-[#8B5CF6]/10 text-[#8B5CF6] px-2.5 py-1 rounded-full font-medium"><Sparkles className="w-3 h-3" strokeWidth={1.5} />Powered by AI</span>
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#0c0c10] border border-white/[0.06] rounded-xl p-5 flex gap-4 animate-pulse">
                <div className="flex-shrink-0 w-16 h-24 rounded-lg bg-[#111118]" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-[#111118] rounded w-3/4" />
                  <div className="h-3 bg-[#111118] rounded w-1/2" />
                  <div className="h-3 bg-[#111118] rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : reviewMovies.length > 0 ? (
          <div className="card-grid grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {reviewMovies.map((movie) => {
              const year = movie.release_date ? movie.release_date.split('-')[0] : '';
              const genreNames = movie.genres.slice(0, 2).map((g) => g.name).join(', ');
              const posterUrl = movie.poster_path?.startsWith('http') ? movie.poster_path : movie.poster_path?.startsWith('/') ? `https://image.tmdb.org/t/p/w185${movie.poster_path}` : movie.poster_path;
              return (
                <Link key={movie.id} href={`/movie/${movie.slug}`} className="card-reveal bg-[#0c0c10] border border-white/[0.06] rounded-xl p-5 flex gap-4 hover:border-[#8B5CF6]/30 hover:shadow-lg transition-all group">
                  <div className="flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden bg-[#0c0c10]"><img src={posterUrl} alt={movie.title} className="w-full h-full object-cover" loading="lazy" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1"><h3 className="text-base font-semibold text-white truncate group-hover:text-[#8B5CF6] transition-colors">{movie.title}</h3><span className="text-xs font-bold text-[#8B5CF6] flex-shrink-0">{movie.vote_average.toFixed(1)}</span></div>
                    <div className="flex items-center gap-2 mb-2">{year && <span className="text-xs text-[#6b7280]">{year}</span>}{year && genreNames && <span className="text-[#1e1e28]">·</span>}{genreNames && <span className="text-xs text-[#6b7280]">{genreNames}</span>}</div>
                    <p className="text-sm text-[#9ca3af] line-clamp-2 leading-relaxed mb-2">{movie.overview}</p>
                    <span className="inline-flex items-center gap-1 text-sm text-[#8B5CF6] hover:text-[#ff1a25] transition-colors font-medium">Read Full Review<ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} /></span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
