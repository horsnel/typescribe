'use client';
import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import MovieCard from '@/components/movie/MovieCard';
import type { Movie } from '@/lib/types';

export default function TrendingCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromAPI, setFromAPI] = useState(false);

  const scroll = (direction: 'left' | 'right') => { if (!scrollRef.current) return; scrollRef.current.scrollBy({ left: direction === 'left' ? -420 : 420, behavior: 'smooth' }); };

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/browse?source=trending&count=20', { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.movies?.length > 0) {
          setTrendingMovies(data.movies);
          setFromAPI(data.fromAPI || false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const displayMovies = trendingMovies;

  return (
    <section id="trending" className="py-12 bg-[#050507]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="reveal-section flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Trending Now</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <button onClick={() => scroll('left')} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#0c0c10] border border-white/[0.06] text-white hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition-colors" aria-label="Scroll left"><ChevronLeft className="w-5 h-5" strokeWidth={1.5} /></button>
              <button onClick={() => scroll('right')} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#0c0c10] border border-white/[0.06] text-white hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition-colors" aria-label="Scroll right"><ChevronRight className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <Link href="/browse" className="flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-[#8B5CF6] transition-colors">See All<ArrowRight className="w-4 h-4" strokeWidth={1.5} /></Link>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#8B5CF6] animate-spin" strokeWidth={1.5} />
          </div>
        ) : (
          <div ref={scrollRef} className="carousel-track flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 -mx-6 px-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            {displayMovies.map((movie) => (<div key={movie.id} className="carousel-card snap-start flex-shrink-0 w-[160px] sm:w-[180px]"><MovieCard movie={movie} /></div>))}
          </div>
        )}
        <style>{`.carousel-track::-webkit-scrollbar { display: none; }`}</style>
      </div>
    </section>
  );
}
