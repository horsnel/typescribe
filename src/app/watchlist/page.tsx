'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Bookmark, Trash2, Star, Film, ArrowRight } from 'lucide-react';
import { useAuth, getLocalWatchlist } from '@/lib/auth';
import type { WatchlistItem } from '@/lib/auth';
import { Button } from '@/components/ui/button';

type SortOption = 'date-added' | 'rating' | 'title';

export default function WatchlistPage() {
  const { user, isAuthenticated } = useAuth();
  const [sort, setSort] = useState<SortOption>('date-added');
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>(getLocalWatchlist());

  useEffect(() => { const __m = document.querySelector('main'); if (__m) __m.scrollTo({ top: 0 }); else window.scrollTo(0, 0); }, []);

  // useMemo MUST be called before any early return so hook order is stable.
  const filtered = useMemo(() => {
    const result = [...watchlistItems];
    switch (sort) {
      case 'rating': result.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'title': result.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
      case 'date-added':
      default:
        result.sort((a, b) => new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()); break;
    }
    return result;
  }, [watchlistItems, sort]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center pt-20">
        <div className="text-center">
          <p className="text-[#9ca3af] mb-4">Please sign in to view your watchlist</p>
          <Link href="/login" className="text-[#D4A853] hover:underline">Sign In</Link>
        </div>
      </div>
    );
  }

  const handleRemove = (movieId: number) => {
    const updated = watchlistItems.filter(w => w.movieId !== movieId);
    setWatchlistItems(updated);
    localStorage.setItem('typescribe_watchlist', JSON.stringify(updated));
  };

  // Stats
  const avgRating = watchlistItems.length > 0
    ? (watchlistItems.reduce((sum, m) => sum + (m.rating || 0), 0) / watchlistItems.length).toFixed(1)
    : '0';
  const highlyRated = watchlistItems.filter(m => (m.rating || 0) >= 8).length;

  return (
    <div className="min-h-screen bg-[#050507] pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
        <div className="flex items-center gap-3 mb-4">
          <Bookmark className="w-6 h-6 text-[#D4A853]" strokeWidth={1.5} />
          <h1 className="text-3xl lg:text-4xl font-extrabold text-white">My Watchlist</h1>
        </div>

        {/* Stats Row */}
        {watchlistItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
              <Bookmark className="w-5 h-5 text-[#D4A853] mx-auto mb-1" strokeWidth={1.5} />
              <div className="text-xl font-bold text-white">{watchlistItems.length}</div>
              <div className="text-xs text-[#6b7280]">Movies</div>
            </div>
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
              <Star className="w-5 h-5 text-[#D4A853] mx-auto mb-1" strokeWidth={1.5} />
              <div className="text-xl font-bold text-white">{avgRating}</div>
              <div className="text-xs text-[#6b7280]">Avg Rating</div>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
              <Star className="w-5 h-5 text-green-400 mx-auto mb-1" strokeWidth={1.5} />
              <div className="text-xl font-bold text-white">{highlyRated}</div>
              <div className="text-xs text-[#6b7280]">Highly Rated (8+)</div>
            </div>
          </div>
        )}

        {/* Sort controls */}
        {watchlistItems.length > 0 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {([
              { value: 'date-added', label: 'Recently Added' },
              { value: 'rating', label: 'Rating' },
              { value: 'title', label: 'Title' },
            ] as { value: SortOption; label: string }[]).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSort(value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  sort === value ? 'bg-[#D4A853] text-white' : 'bg-[#0c0c10] border border-[#1e1e28] text-[#9ca3af] hover:text-white hover:border-[#3a3a45]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Movies grid */}
        {watchlistItems.length > 0 ? (
          filtered.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {filtered.map((item) => {
                const href = item.slug ? `/movie/${item.slug}` : null;
                const inner = (
                  <>
                    {/* Poster */}
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#111118] flex-shrink-0">
                      {item.poster ? (
                         
                        <img
                          src={item.poster}
                          alt={item.title || ''}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a22] to-[#0c0c10]">
                          <Film className="w-8 h-8 text-[#2a2a35]" strokeWidth={1.5} />
                        </div>
                      )}
                      {typeof item.rating === 'number' && item.rating > 0 && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#D4A853] text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                          <Star className="w-3 h-3 fill-black" strokeWidth={1.5} />
                          {item.rating.toFixed(1)}
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(item.movieId); }}
                        className="absolute top-2 left-2 z-10 p-1.5 bg-[#050507]/80 backdrop-blur-sm rounded-full text-[#9ca3af] hover:text-red-400 hover:bg-[#050507] transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                        title="Remove from watchlist"
                        aria-label="Remove from watchlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="mt-2.5">
                      <h3 className="text-sm font-semibold text-white truncate group-hover:text-[#D4A853] transition-colors">
                        {item.title || `Movie #${item.movieId}`}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[#6b7280]">
                        {item.year && <span>{item.year}</span>}
                        {href && (
                          <span className="hidden sm:flex items-center gap-1 ml-auto text-[#D4A853]">
                            View <ArrowRight className="w-3 h-3" strokeWidth={2} />
                          </span>
                        )}
                      </div>
                      {href && (
                        <div className="sm:hidden flex items-center gap-1 mt-1.5 text-[10px] font-medium text-[#D4A853]">
                          View details <ArrowRight className="w-3 h-3" strokeWidth={2} />
                        </div>
                      )}
                    </div>
                  </>
                );
                return href ? (
                  <Link key={item.movieId} href={href} className="group cursor-pointer block">
                    {inner}
                  </Link>
                ) : (
                  <div key={item.movieId} className="group">
                    {inner}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-[#9ca3af] mb-2">No movies match your filter</p>
            </div>
          )
        ) : (
          <div className="text-center py-24">
            <Bookmark className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-lg text-[#9ca3af] mb-2">Your watchlist is empty</p>
            <p className="text-sm text-[#6b7280] mb-4">Start adding movies you want to watch</p>
            <Link href="/browse" className="text-[#D4A853] hover:underline">Browse Movies</Link>
          </div>
        )}
      </div>
    </div>
  );
}
