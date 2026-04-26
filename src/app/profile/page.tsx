'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, getLocalWatchlist } from '@/lib/auth';
import { Settings, Bookmark, MessageSquare, Film, Star, Calendar, TrendingUp, Clock, Eye, Heart, BarChart3, ChevronRight, Camera } from 'lucide-react';
import { userReviews, movies } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const PRESET_AVATARS = [
  { id: 'av1', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix', label: 'Felix' },
  { id: 'av2', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka', label: 'Aneka' },
  { id: 'av3', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster', label: 'Buster' },
  { id: 'av4', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Duke', label: 'Duke' },
  { id: 'av5', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper', label: 'Jasper' },
  { id: 'av6', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna', label: 'Luna' },
  { id: 'av7', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Midnight', label: 'Midnight' },
  { id: 'av8', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Shadow', label: 'Shadow' },
  { id: 'av9', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Simba', label: 'Simba' },
  { id: 'av10', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe', label: 'Zoe' },
  { id: 'av11', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Willow', label: 'Willow' },
  { id: 'av12', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Phoenix', label: 'Phoenix' },
];

export default function ProfilePage() {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'activity' | 'stats'>('activity');
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  useEffect(() => {
    setWatchlistCount(getLocalWatchlist().length);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#a0a0b0] mb-4">Please sign in to view your profile</p>
          <Link href="/login" className="text-[#e50914] hover:underline">Sign In</Link>
        </div>
      </div>
    );
  }

  const userInitials = user.display_name
    ? user.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const userReviewList = userReviews.filter(r => r.user_id === 101);
  const avgRating = userReviewList.length > 0 ? (userReviewList.reduce((sum, r) => sum + r.rating, 0) / userReviewList.length).toFixed(1) : '0';

  const ratingBuckets = Array.from({ length: 10 }, (_, i) => {
    const bucket = userReviewList.filter(r => Math.floor(r.rating) === i + 1).length;
    return { rating: i + 1, count: bucket };
  });
  const maxBucket = Math.max(...ratingBuckets.map(b => b.count), 1);

  const genreDistribution: Record<string, number> = {};
  userReviewList.forEach((r) => {
    const movie = movies.find(m => m.id === r.movie_id);
    if (movie) {
      movie.genres.forEach((g) => {
        genreDistribution[g.name] = (genreDistribution[g.name] || 0) + 1;
      });
    }
  });
  const topGenres = Object.entries(genreDistribution).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const activityItems = userReviewList.slice(0, 5).map((r) => {
    const movie = movies.find(m => m.id === r.movie_id);
    return {
      type: 'review' as const,
      date: r.created_at,
      title: `Reviewed ${movie?.title || 'a movie'}`,
      detail: `Rated ${r.rating}/10`,
      movieSlug: movie?.slug,
    };
  });

  const handleAvatarSelect = (avatarUrl: string) => {
    updateProfile({ avatar: avatarUrl });
    setAvatarDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] pt-8 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 py-8">

        {/* Profile Avatar - Prominent Display */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#e50914] to-[#b20710] flex items-center justify-center text-white text-3xl font-bold overflow-hidden ring-4 ring-[#e50914]/20">
              {user.avatar ? (
                <img src={user.avatar} alt={user.display_name} className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
            <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
              <DialogTrigger asChild>
                <button
                  className="absolute bottom-1 right-1 w-9 h-9 bg-[#12121a] border border-[#2a2a35] rounded-full flex items-center justify-center text-[#a0a0b0] hover:text-white hover:border-[#e50914] transition-all shadow-lg"
                  aria-label="Change avatar"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#12121a] border-[#2a2a35] text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white">Choose Your Avatar</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-4 gap-3 py-4">
                  {PRESET_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => handleAvatarSelect(av.url)}
                      className={`relative rounded-xl p-1 transition-all hover:scale-105 ${
                        user.avatar === av.url ? 'ring-2 ring-[#e50914] bg-[#e50914]/10' : 'bg-[#0a0a0f] border border-[#2a2a35] hover:border-[#3a3a45]'
                      }`}
                    >
                      <img src={av.url} alt={av.label} className="w-full aspect-square rounded-lg" />
                      <span className="block text-[10px] text-[#6b6b7b] text-center mt-1 truncate">{av.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#6b6b7b] text-center">Click an avatar to apply it</p>
              </DialogContent>
            </Dialog>
          </div>
          <h1 className="text-2xl font-bold text-white mt-4">{user.display_name}</h1>
          <p className="text-[#6b6b7b] text-sm">{user.email}</p>
          <p className="text-sm text-[#a0a0b0] mt-2 leading-relaxed text-center max-w-md">{user.bio || 'No bio yet. Click edit to tell us about yourself and your movie tastes.'}</p>
          <div className="flex items-center gap-4 mt-3 flex-wrap justify-center">
            {user.favorite_genres && user.favorite_genres.length > 0 && (
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[#e50914]" />
                <span className="text-xs text-[#a0a0b0]">{user.favorite_genres.join(', ')}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-[#6b6b7b]" />
              <span className="text-xs text-[#6b6b7b]">Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
            {user.public_profile && (
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400">Public Profile</span>
              </div>
            )}
          </div>
          <Link href="/profile/edit" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a25] border border-[#2a2a35] rounded-lg text-sm text-white hover:border-[#3a3a45] transition-colors">
            <Settings className="w-4 h-4" /> Edit Profile
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 text-center hover:border-[#3a3a45] transition-colors">
            <MessageSquare className="w-6 h-6 text-[#e50914] mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{userReviewList.length}</div>
            <div className="text-xs text-[#6b6b7b]">Reviews</div>
          </div>
          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 text-center hover:border-[#3a3a45] transition-colors">
            <Star className="w-6 h-6 text-[#f5c518] mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{avgRating}</div>
            <div className="text-xs text-[#6b6b7b]">Avg Rating</div>
          </div>
          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 text-center hover:border-[#3a3a45] transition-colors">
            <Bookmark className="w-6 h-6 text-[#e50914] mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{watchlistCount}</div>
            <div className="text-xs text-[#6b6b7b]">Watchlist</div>
          </div>
          <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 text-center hover:border-[#3a3a45] transition-colors">
            <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">24</div>
            <div className="text-xs text-[#6b6b7b]">Helpful Votes</div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link href="/watchlist" className="flex items-center gap-3 bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 hover:border-[#3a3a45] transition-colors group">
            <Bookmark className="w-5 h-5 text-[#e50914]" />
            <div className="flex-1">
              <span className="text-sm font-medium text-white group-hover:text-[#e50914] transition-colors">Watchlist</span>
              <p className="text-xs text-[#6b6b7b] mt-0.5">{watchlistCount} movies saved</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6b6b7b] group-hover:text-white transition-colors" />
          </Link>
          <Link href="/my-reviews" className="flex items-center gap-3 bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 hover:border-[#3a3a45] transition-colors group">
            <MessageSquare className="w-5 h-5 text-[#e50914]" />
            <div className="flex-1">
              <span className="text-sm font-medium text-white group-hover:text-[#e50914] transition-colors">My Reviews</span>
              <p className="text-xs text-[#6b6b7b] mt-0.5">{userReviewList.length} reviews written</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6b6b7b] group-hover:text-white transition-colors" />
          </Link>
          <Link href="/settings" className="flex items-center gap-3 bg-[#12121a] border border-[#2a2a35] rounded-xl p-5 hover:border-[#3a3a45] transition-colors group">
            <Settings className="w-5 h-5 text-[#e50914]" />
            <div className="flex-1">
              <span className="text-sm font-medium text-white group-hover:text-[#e50914] transition-colors">Settings</span>
              <p className="text-xs text-[#6b6b7b] mt-0.5">Notifications & privacy</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6b6b7b] group-hover:text-white transition-colors" />
          </Link>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-[#2a2a35] mb-6">
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 px-4 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'activity' ? 'text-white border-b-2 border-[#e50914]' : 'text-[#6b6b7b] hover:text-[#a0a0b0]'}`}
          >
            <Clock className="w-4 h-4" /> Recent Activity
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-3 px-4 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'stats' ? 'text-white border-b-2 border-[#e50914]' : 'text-[#6b6b7b] hover:text-[#a0a0b0]'}`}
          >
            <BarChart3 className="w-4 h-4" /> Stats & Insights
          </button>
        </div>

        {activeTab === 'activity' && (
          <>
            {activityItems.length > 0 ? (
              <div className="space-y-3">
                {activityItems.map((item, idx) => (
                  <Link
                    key={idx}
                    href={item.movieSlug ? `/movie/${item.movieSlug}` : '#'}
                    className="flex items-center gap-4 bg-[#12121a] border border-[#2a2a35] rounded-xl p-4 hover:border-[#3a3a45] transition-colors group"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.type === 'review' ? 'bg-[#e50914]/10' : 'bg-[#f5c518]/10'}`}>
                      {item.type === 'review' ? <MessageSquare className="w-5 h-5 text-[#e50914]" /> : <Heart className="w-5 h-5 text-[#f5c518]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white group-hover:text-[#e50914] transition-colors">{item.title}</p>
                      <p className="text-xs text-[#6b6b7b]">{item.detail}</p>
                    </div>
                    <span className="text-xs text-[#6b6b7b] flex-shrink-0">
                      {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" />
                <p className="text-[#a0a0b0]">No activity yet</p>
                <p className="text-sm text-[#6b6b7b]">Start reviewing movies to see your activity here</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Rating Distribution</h3>
              <div className="space-y-2">
                {ratingBuckets.reverse().map(({ rating, count }) => (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-xs text-[#6b6b7b] w-6 text-right">{rating}</span>
                    <div className="flex-1 h-4 bg-[#0a0a0f] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#e50914] rounded-full transition-all"
                        style={{ width: `${(count / maxBucket) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#6b6b7b] w-4">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Favorite Genres</h3>
              {topGenres.length > 0 ? (
                <div className="space-y-3">
                  {topGenres.map(([name, count]) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-sm text-[#a0a0b0] w-24">{name}</span>
                      <div className="flex-1 h-4 bg-[#0a0a0f] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#f5c518] rounded-full transition-all"
                          style={{ width: `${(count / (topGenres[0]?.[1] || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#6b6b7b]">{count} reviews</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6b6b7b]">Write reviews to see your genre preferences</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
