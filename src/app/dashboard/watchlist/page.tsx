'use client';

import { useEffect, useState } from 'react';
import { useAuth, getLocalWatchlist } from '@/lib/auth';
import { Bookmark, Film, Trash2, ExternalLink, Star } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface WatchlistItem {
  movieId: number;
  addedDate: string;
  title?: string;
  slug?: string;
  poster?: string;
  rating?: number;
  year?: string;
}

export default function DashboardWatchlistPage() {
  const { user, isAuthenticated } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [sortBy, setSortBy] = useState<string>('date');

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = () => {
    try {
      const data = localStorage.getItem('typescribe_watchlist');
      const items: WatchlistItem[] = data ? JSON.parse(data) : [];
      // Enrich with movie data from mock data if available
      setWatchlist(items);
    } catch { /* ignore */ }
  };

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
    return <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center"><p className="text-[#9ca3af]">Please sign in to view your watchlist.</p><Link href="/login" className="text-[#d4a853] hover:underline text-sm">Sign In</Link></div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Watchlist</h1>
        <div className="flex items-center gap-3">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-[#0c0c10] border border-[#1e1e28] rounded-lg py-1.5 px-3 text-sm text-[#9ca3af] focus:outline-none focus:border-[#d4a853]">
            <option value="date">Date Added</option>
            <option value="rating">Rating</option>
            <option value="title">Title</option>
          </select>
          <Link href="/browse"><Button className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 text-sm"><Film className="w-4 h-4" strokeWidth={1.5} />Add Movies</Button></Link>
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
          <Link href="/browse"><Button className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2"><Film className="w-4 h-4" strokeWidth={1.5} />Browse Movies</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedWatchlist.map((item) => (
            <div key={item.movieId} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 hover:border-[#3a3a45] transition-colors flex items-center gap-4">
              {/* Poster */}
              <div className="w-12 h-16 rounded-lg overflow-hidden bg-[#111118] flex-shrink-0">
                {item.poster ? (
                  <img src={item.poster} alt={item.title || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-5 h-5 text-[#2a2a35]" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {item.slug ? (
                    <Link href={`/movie/${item.slug}`} className="text-sm font-semibold text-white hover:text-[#d4a853] transition-colors truncate">
                      {item.title || `Movie #${item.movieId}`}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-white truncate">{item.title || `Movie #${item.movieId}`}</span>
                  )}
                  {item.rating && (
                    <div className="flex items-center gap-1 text-xs text-[#f5c518] flex-shrink-0">
                      <Star className="w-3 h-3 fill-[#f5c518]" strokeWidth={1.5} />
                      <span>{item.rating}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[#6b7280]">
                  {item.year && <span>{item.year}</span>}
                  <span>Added {formatTimeAgo(item.addedDate)}</span>
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {item.slug && (
                  <Link href={`/movie/${item.slug}`} className="p-2 text-[#6b7280] hover:text-white transition-colors">
                    <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                  </Link>
                )}
                <button onClick={() => handleRemove(item.movieId)} className="p-2 text-[#6b7280] hover:text-red-400 transition-colors rounded-lg hover:bg-[#111118]">
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
