'use client';

import { useEffect, useState } from 'react';
import { useAuth, getLocalWatchlist } from '@/lib/auth';
import type { WatchlistItem } from '@/lib/auth';
import { Bookmark, Film, Trash2, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardWatchlistPage() {
  const { user, isAuthenticated } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [sortBy, setSortBy] = useState<string>('date');

  const loadWatchlist = () => {
    setWatchlist(getLocalWatchlist());
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleRemove = (movieId: number) => {
    const updated = watchlist.filter(w => w.movieId !== movieId);
    setWatchlist(updated);
    localStorage.setItem('typescribe_watchlist', JSON.stringify(updated));
  };

  const sortedWatchlist = [...watchlist].sort((a, b) => {
    switch (sortBy) {
      case 'rating': return (b.rating || 0) - (a.rating || 0);
      case 'title': return (a.title || '').localeCompare(b.title || '');
      default: return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
    }
  });

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  if (!isAuthenticated) {
    return <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center"><p className="text-[#9ca3af]">Please sign in to view your watchlist.</p><Link href="/login" className="text-[#D4A853] hover:underline text-sm">Sign In</Link></div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Watchlist</h1>
        <div className="flex items-center gap-3">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-[#0c0c10] border border-[#1e1e28] rounded-lg py-1.5 px-3 text-sm text-[#9ca3af] focus:outline-none focus:border-[#D4A853]">
            <option value="date">Date Added</option>
            <option value="rating">Rating</option>
            <option value="title">Title</option>
          </select>
          <Link href="/browse"><Button className="bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2 text-sm"><Film className="w-4 h-4" strokeWidth={1.5} />Add Movies</Button></Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{watchlist.length}</p>
          <p className="text-xs text-[#6b7280]">Total in Watchlist</p>
        </div>
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{watchlist.filter(w => w.rating && w.rating >= 8).length}</p>
          <p className="text-xs text-[#6b7280]">Highly Rated (8+)</p>
        </div>
      </div>

      {/* Watchlist or Empty State */}
      {sortedWatchlist.length === 0 ? (
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center">
          <Bookmark className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-white mb-2">Your watchlist is empty</h2>
          <p className="text-[#9ca3af] mb-6">Start adding movies you want to watch.</p>
          <Link href="/browse"><Button className="bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2"><Film className="w-4 h-4" strokeWidth={1.5} />Browse Movies</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {sortedWatchlist.map((item) => {
            const href = item.slug ? `/movie/${item.slug}` : null;
            // Outer card: when we have a slug, the entire card is a link.
            // The remove button sits on top with a higher z-index and
            // stopPropagation so clicks don't trigger navigation.
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
                  {/* Rating chip */}
                  {typeof item.rating === 'number' && item.rating > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#D4A853] text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                      <Star className="w-3 h-3 fill-black" strokeWidth={1.5} />
                      {item.rating.toFixed(1)}
                    </div>
                  )}
                  {/* Remove button — always visible on touch, hover on desktop */}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(item.movieId); }}
                    className="absolute top-2 left-2 z-10 p-1.5 bg-[#050507]/80 backdrop-blur-sm rounded-full text-[#9ca3af] hover:text-red-400 hover:bg-[#050507] transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                    title="Remove from watchlist"
                    aria-label="Remove from watchlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
                {/* Info */}
                <div className="mt-2.5">
                  <h3 className="text-sm font-semibold text-white truncate group-hover:text-[#D4A853] transition-colors">
                    {item.title || `Movie #${item.movieId}`}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#6b7280]">
                    {item.year && <span>{item.year}</span>}
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">Added {formatTimeAgo(item.addedDate)}</span>
                  </div>
                  {/* Mobile-only "view" hint */}
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
      )}
    </>
  );
}
