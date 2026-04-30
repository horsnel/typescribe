'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight, Sparkles, Clock, Film, Tv, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Movie } from '@/lib/types';

export default function UpcomingMoviesSection() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/browse?sort=primary_release_date.asc&yearFrom=2026&yearTo=2027&page=1&source=upcoming').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/browse?format=tv&sort=primary_release_date.asc&yearFrom=2026&yearTo=2027&page=1').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([movieData, seriesData]) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const filterUpcoming = (items: Movie[]) => (items || []).filter((m: Movie) => {
        if (!m.release_date) return true;
        return new Date(m.release_date) >= today;
      }).slice(0, 8);

      setMovies(filterUpcoming(movieData?.movies || []));
      setSeries(filterUpcoming(seriesData?.movies || []));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const getReleaseInfo = (dateStr: string) => {
    if (!dateStr) return { display: 'TBA', countdown: '' };
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const display = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (diff > 0) return { display, countdown: `${diff}d` };
    if (diff === 0) return { display, countdown: 'Today' };
    return { display, countdown: '' };
  };

  const allItems = [...movies.slice(0, 4), ...series.slice(0, 4)];
  if (!loading && allItems.length === 0) return null;

  return (
    <section className="py-12 bg-gradient-to-b from-[#050507] via-[#08080c] to-[#050507]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#d4a853]/10 border border-[#d4a853]/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#d4a853]" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white">Upcoming Movies & Series</h2>
              <p className="text-xs text-[#6b7280] mt-0.5">Coming soon to screens near you</p>
            </div>
          </div>
          <Link href="/upcoming">
            <Button variant="ghost" className="text-[#9ca3af] hover:text-[#d4a853] gap-1 text-sm">
              View All <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </Button>
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#d4a853]/30 border-t-[#d4a853] rounded-full animate-spin" />
          </div>
        ) : (
          <div ref={scrollRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
            {allItems.map((item, idx) => {
              const isSeries = idx >= Math.min(movies.length, 4);
              const releaseInfo = getReleaseInfo(item.release_date);
              return (
                <Link
                  key={`${item.id}-${idx}`}
                  href={isSeries ? `/series/${item.slug || item.id}` : `/movie/${item.slug || item.id}`}
                  className="group bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden hover:border-[#d4a853]/30 transition-all"
                >
                  <div className="aspect-[2/3] relative overflow-hidden bg-[#111118]">
                    <img
                      src={item.poster_path}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c10] via-transparent to-transparent" />
                    {/* Upcoming badge */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <span className="text-[9px] font-bold bg-[#d4a853] text-white px-1.5 py-0.5 rounded-full shadow-lg uppercase">
                        {isSeries ? 'Series' : 'Upcoming'}
                      </span>
                      {releaseInfo.countdown && (
                        <span className="text-[9px] font-medium bg-black/80 text-[#d4a853] px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                          {releaseInfo.countdown}
                        </span>
                      )}
                    </div>
                    {/* Type indicator */}
                    {isSeries && (
                      <div className="absolute top-2 right-2">
                        <Tv className="w-3.5 h-3.5 text-purple-400 drop-shadow-lg" strokeWidth={1.5} />
                      </div>
                    )}
                    {/* Rating */}
                    {item.vote_average > 0 && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/70 rounded-full px-1.5 py-0.5 backdrop-blur-sm">
                        <Star className="w-3 h-3 fill-[#f5c518] text-[#f5c518]" strokeWidth={0} />
                        <span className="text-[10px] font-semibold text-white">{item.vote_average.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-white group-hover:text-[#d4a853] transition-colors truncate">{item.title}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3 h-3 text-[#6b7280] flex-shrink-0" strokeWidth={1.5} />
                      <span className="text-[10px] text-[#6b7280] truncate">{releaseInfo.display}</span>
                    </div>
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
