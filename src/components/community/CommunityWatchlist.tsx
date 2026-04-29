'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BookmarkPlus, ChevronUp, ChevronDown, Film, Crown,
  Search, X, Plus, Trash2, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import {
  getCommunityWatchlist,
  addWatchlistItem,
  voteWatchlistItem,
  removeWatchlistItem,
  getWeeklyPick,
  type WatchlistItem,
} from '@/lib/community-storage';

interface CommunityWatchlistProps {
  communityId: string;
  isMember: boolean;
}

export default function CommunityWatchlist({ communityId, isMember }: CommunityWatchlistProps) {
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [weeklyPick, setWeeklyPick] = useState<WatchlistItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: number; title: string; slug: string; poster_path: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const loadWatchlist = useCallback(() => {
    const watchlist = getCommunityWatchlist(communityId);
    setItems(watchlist.sort((a, b) => b.votes - a.votes));
    setWeeklyPick(getWeeklyPick(communityId));
  }, [communityId]);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  const handleVote = (itemId: string) => {
    if (!user) return;
    voteWatchlistItem(communityId, itemId, user.id);
    loadWatchlist();
  };

  const handleRemove = (itemId: string) => {
    removeWatchlistItem(communityId, itemId);
    loadWatchlist();
  };

  const handleAddMovie = (movie: { id: number; title: string; slug: string; poster_path: string }) => {
    if (!user) return;
    // Check if already in watchlist
    if (items.some(i => i.movieId === movie.id)) return;
    addWatchlistItem({
      communityId,
      movieId: movie.id,
      movieTitle: movie.title,
      movieSlug: movie.slug,
      posterPath: movie.poster_path,
      addedBy: user.display_name,
      addedById: user.id,
    });
    loadWatchlist();
    setShowAddForm(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch { /* ignore */ }
    setSearchLoading(false);
  };

  const hasVoted = (item: WatchlistItem) => user ? item.votedUsers.includes(user.id) : false;

  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#1e1e28]/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <BookmarkPlus className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Watchlist</h3>
              <p className="text-xs text-[#6b7280]">Vote on what to watch next</p>
            </div>
          </div>
          {isAuthenticated && isMember && (
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2 min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> Add Movie
            </Button>
          )}
        </div>
      </div>

      <div className="p-5">
        {/* Add Movie Form */}
        {showAddForm && (
          <div className="mb-5 bg-[#050507] border border-purple-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">Add a movie</h4>
              <button onClick={() => { setShowAddForm(false); setSearchQuery(''); setSearchResults([]); }} className="text-[#6b7280] hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search for a movie..."
                className="w-full bg-[#0c0c10] border border-[#1e1e28] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-purple-500 text-sm min-h-[44px]"
              />
            </div>
            {searchLoading && (
              <p className="text-xs text-[#6b7280] mt-2 text-center">Searching...</p>
            )}
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {searchResults.map((movie) => {
                  const alreadyAdded = items.some(i => i.movieId === movie.id);
                  return (
                    <button
                      key={movie.id}
                      onClick={() => !alreadyAdded && handleAddMovie(movie)}
                      disabled={alreadyAdded}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                        alreadyAdded ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#1e1e28] cursor-pointer'
                      }`}
                    >
                      <div className="w-8 h-12 rounded overflow-hidden flex-shrink-0 bg-[#1e1e28]">
                        {movie.poster_path && (
                          <img
                            src={movie.poster_path.startsWith('/') ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` : movie.poster_path}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{movie.title}</p>
                        <p className="text-[10px] text-[#6b7280]">{alreadyAdded ? 'Already on watchlist' : 'Click to add'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Weekly Pick Highlight */}
        {weeklyPick && (
          <div className="mb-5 bg-gradient-to-r from-purple-500/10 to-[#d4a853]/10 border border-purple-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-[#d4a853]" />
              <span className="text-xs font-bold text-[#d4a853] uppercase tracking-wider">This Week&apos;s Pick</span>
            </div>
            <Link href={`/movie/${weeklyPick.movieSlug}`} className="flex items-center gap-3 group">
              <div className="w-12 h-18 rounded overflow-hidden flex-shrink-0 bg-[#1e1e28]">
                {weeklyPick.posterPath && (
                  <img
                    src={weeklyPick.posterPath.startsWith('/') ? `https://image.tmdb.org/t/p/w185${weeklyPick.posterPath}` : weeklyPick.posterPath}
                    alt={weeklyPick.movieTitle}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
              </div>
              <div>
                <h4 className="text-base font-semibold text-white group-hover:text-[#d4a853] transition-colors">{weeklyPick.movieTitle}</h4>
                <p className="text-xs text-[#6b7280]">{weeklyPick.votes} vote{weeklyPick.votes !== 1 ? 's' : ''} · Nominated by {weeklyPick.addedBy}</p>
              </div>
            </Link>
          </div>
        )}

        {/* Watchlist Items */}
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item, index) => {
              const voted = hasVoted(item);
              const isTopPick = weeklyPick?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isTopPick ? 'bg-purple-500/5 border border-purple-500/15' : 'bg-[#050507] border border-[#1e1e28]/50 hover:border-[#2a2a35]'
                  }`}
                >
                  {/* Vote Column */}
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => handleVote(item.id)}
                      disabled={!isAuthenticated || !isMember}
                      className={`transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center rounded ${
                        voted ? 'text-purple-400' : 'text-[#6b7280] hover:text-purple-400'
                      } ${!isAuthenticated || !isMember ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <ChevronUp className="w-5 h-5" fill={voted ? 'currentColor' : 'none'} />
                    </button>
                    <span className={`text-xs font-bold ${isTopPick ? 'text-purple-400' : voted ? 'text-purple-400' : 'text-[#9ca3af]'}`}>
                      {item.votes}
                    </span>
                  </div>

                  {/* Poster */}
                  <Link href={`/movie/${item.movieSlug}`} className="flex-shrink-0">
                    <div className="w-10 h-15 rounded overflow-hidden bg-[#1e1e28]">
                      {item.posterPath && (
                        <img
                          src={item.posterPath.startsWith('/') ? `https://image.tmdb.org/t/p/w92${item.posterPath}` : item.posterPath}
                          alt={item.movieTitle}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/movie/${item.movieSlug}`} className="text-sm font-medium text-white hover:text-[#d4a853] transition-colors truncate block">
                      {item.movieTitle}
                    </Link>
                    <p className="text-[10px] text-[#6b7280]">Added by {item.addedBy}</p>
                  </div>

                  {/* Remove (only for the person who added it) */}
                  {user && user.id === item.addedById && (
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-[#6b7280] hover:text-red-400 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Film className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" />
            <p className="text-sm text-[#9ca3af] mb-1">No movies yet</p>
            <p className="text-xs text-[#6b7280]">Add a movie to the community watchlist!</p>
          </div>
        )}
      </div>
    </div>
  );
}
