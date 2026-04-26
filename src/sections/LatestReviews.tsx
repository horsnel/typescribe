'use client';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { movies } from '@/lib/data';

export default function LatestReviews() {
  const reviewMovies = movies.slice(0, 6);
  return (
    <section className="py-20 bg-[#12121a]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="reveal-section flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Latest AI Reviews</h2>
            <span className="flex items-center gap-1 text-xs bg-[#e50914]/10 text-[#e50914] px-2.5 py-1 rounded-full font-medium"><Sparkles className="w-3 h-3" />Powered by AI</span>
          </div>
        </div>
        <div className="card-grid grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {reviewMovies.map((movie) => {
            const year = movie.release_date ? movie.release_date.split('-')[0] : '';
            const genreNames = movie.genres.slice(0, 2).map((g) => g.name).join(', ');
            return (
              <Link key={movie.id} href={`/movie/${movie.slug}`} className="card-reveal bg-[#0a0a0f] border border-[#2a2a35] rounded-xl p-5 flex gap-4 hover:border-[#3a3a45] hover:shadow-lg transition-all group">
                <div className="flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden bg-[#12121a]"><img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover" loading="lazy" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1"><h3 className="text-base font-semibold text-white truncate group-hover:text-[#e50914] transition-colors">{movie.title}</h3><span className="text-xs font-bold text-[#f5c518] flex-shrink-0">{movie.vote_average.toFixed(1)}</span></div>
                  <div className="flex items-center gap-2 mb-2">{year && <span className="text-xs text-[#6b6b7b]">{year}</span>}{year && genreNames && <span className="text-[#2a2a35]">·</span>}{genreNames && <span className="text-xs text-[#6b6b7b]">{genreNames}</span>}</div>
                  <p className="text-sm text-[#a0a0b0] line-clamp-2 leading-relaxed mb-2">{movie.ai_review}</p>
                  <span className="inline-flex items-center gap-1 text-sm text-[#e50914] hover:text-[#ff1a25] transition-colors font-medium">Read Full Review<ArrowRight className="w-3.5 h-3.5" /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
