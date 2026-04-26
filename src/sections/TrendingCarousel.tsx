'use client';
import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { movies } from '@/lib/data';
import MovieCard from '@/components/movie/MovieCard';
import type { Movie } from '@/lib/types';

export default function TrendingCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromAPI, setFromAPI] = useState(false);

  const scroll = (direction: 'left' | 'right') => { if (!scrollRef.current) return; scrollRef.current.scrollBy({ left: direction === 'left' ? -420 : 420, behavior: 'smooth' }); };

  useEffect(() => {
    fetch('/api/browse?source=trending&count=20')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.movies?.length > 0 && data.fromAPI) {
          setTrendingMovies(data.movies);
          setFromAPI(true);
        } else {
          setTrendingMovies(movies);
        }
      })
      .catch(() => setTrendingMovies(movies))
      .finally(() => setLoading(false));
  }, []);

  const displayMovies = trendingMovies.length > 0 ? trendingMovies : movies;

  return (
    <section id="trending" className="py-20 bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="reveal-section flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Trending Now</h2>
            {fromAPI && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Live</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <button onClick={() => scroll('left')} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#12121a] border border-[#2a2a35] text-white hover:border-[#e50914] hover:text-[#e50914] transition-colors" aria-label="Scroll left"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => scroll('right')} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#12121a] border border-[#2a2a35] text-white hover:border-[#e50914] hover:text-[#e50914] transition-colors" aria-label="Scroll right"><ChevronRight className="w-5 h-5" /></button>
            </div>
            <Link href="/browse" className="flex items-center gap-1.5 text-sm text-[#a0a0b0] hover:text-[#e50914] transition-colors">See All<ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#e50914] animate-spin" />
          </div>
        ) : (
          <div ref={scrollRef} className="carousel-track flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 -mx-6 px-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            {displayMovies.map((movie) => (<div key={movie.id} className="carousel-card snap-start flex-shrink-0"><MovieCard movie={movie} /></div>))}
          </div>
        )}
        <style>{`.carousel-track::-webkit-scrollbar { display: none; }`}</style>
      </div>
    </section>
  );
}
