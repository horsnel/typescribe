'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, getLocalWatchlist } from '@/lib/auth';
import {
  Settings, Bookmark, MessageSquare, Film, Star, Calendar,
  TrendingUp, Clock, Eye, Heart, BarChart3, Camera,
  Users, Edit3, Mail, Grid3x3, ListVideo, Pencil,
} from 'lucide-react';
import { userReviews, movies, genres } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProfileSkeleton } from '@/components/skeletons/CommunitySkeleton';
import { isFollowing, toggleFollow, getFollowerCount, getFollowingCount } from '@/lib/community-storage';

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
  const [activeTab, setActiveTab] = useState<'posts' | 'reviews' | 'watchlist'>('posts');
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [followState, setFollowState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setWatchlistCount(getLocalWatchlist().length);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user) {
      setFollowState(isFollowing(user.id));
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050507] pt-8 pb-16">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#9ca3af] mb-4">Please sign in to view your profile</p>
          <Link href="/login" className="text-[#d4a853] hover:underline">Sign In</Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = true; // Since we only have own profile view currently

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

  const followersCount = getFollowerCount(user.id);
  const followingCount = getFollowingCount(user.id);

  const handleAvatarSelect = (avatarUrl: string) => {
    updateProfile({ avatar: avatarUrl });
    setAvatarDialogOpen(false);
  };

  const handleFollowToggle = () => {
    const nowFollowing = toggleFollow(user.id);
    setFollowState(nowFollowing);
  };

  const handleEditOpen = () => {
    setEditName(user.display_name);
    setEditBio(user.bio);
    setEditAvatarUrl(user.avatar);
    setEditModalOpen(true);
  };

  const handleEditSave = () => {
    updateProfile({
      display_name: editName.trim() || user.display_name,
      bio: editBio,
      avatar: editAvatarUrl,
    });
    setEditModalOpen(false);
  };

  // Mock community posts for the Posts tab
  const mockPosts = [
    { id: '1', title: 'What horror movie genuinely scared you the most?', content: 'I watched The Silent Dwelling last night and could not sleep. What movie genuinely terrified you?', likes: 89, comments: 45, time: '3mo ago' },
    { id: '2', title: 'Best K-dramas of 2025 so far?', content: 'We are halfway through the year. What are your top picks for K-dramas in 2025?', likes: 102, comments: 56, time: '2mo ago' },
    { id: '3', title: 'Underrated anime that deserve more attention', content: 'Skip the mainstream hits — what anime do you think flew under the radar but absolutely slaps?', likes: 156, comments: 78, time: '1mo ago' },
  ];

  return (
    <div className="min-h-screen bg-[#050507] pt-4 pb-16">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-4">

        {/* ─── Profile Header ─── */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6 pt-4">
          {/* Avatar */}
          <div className="relative group flex-shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-3xl font-bold overflow-hidden ring-4 ring-[#d4a853]/20">
              {user.avatar ? (
                <img src={user.avatar} alt={user.display_name} className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
            {isOwnProfile && (
              <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    className="absolute bottom-1 right-1 w-9 h-9 bg-[#0c0c10] border border-[#1e1e28] rounded-full flex items-center justify-center text-[#9ca3af] hover:text-white hover:border-[#d4a853] transition-all shadow-lg min-w-[44px] min-h-[44px]"
                    aria-label="Change avatar"
                  >
                    <Camera className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-[#0c0c10] border-[#1e1e28] text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white">Choose Your Avatar</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-4 gap-3 py-4">
                    {PRESET_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        onClick={() => handleAvatarSelect(av.url)}
                        className={`relative rounded-xl p-1 transition-all hover:scale-105 ${
                          user.avatar === av.url ? 'ring-2 ring-[#d4a853] bg-[#d4a853]/10' : 'bg-[#050507] border border-[#1e1e28] hover:border-[#3a3a45]'
                        }`}
                      >
                        <img src={av.url} alt={av.label} className="w-full aspect-square rounded-lg" />
                        <span className="block text-[10px] text-[#6b7280] text-center mt-1 truncate">{av.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#6b7280] text-center">Click an avatar to apply it</p>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-extrabold text-white mb-1">{user.display_name}</h1>
            <p className="text-sm text-[#6b7280] mb-2">{user.email}</p>
            <p className="text-sm text-[#9ca3af] leading-relaxed max-w-md mb-3">{user.bio || 'No bio yet. Click edit to tell us about yourself and your movie tastes.'}</p>

            {/* Favorite Genres */}
            {user.favorite_genres && user.favorite_genres.length > 0 && (
              <div className="flex items-center gap-2 mb-3 flex-wrap justify-center sm:justify-start">
                <Film className="w-3.5 h-3.5 text-[#d4a853]" strokeWidth={1.5} />
                {user.favorite_genres.slice(0, 4).map((genre) => (
                  <span key={genre} className="text-xs text-[#d4a853] bg-[#d4a853]/10 px-2 py-0.5 rounded-full">{genre}</span>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 justify-center sm:justify-start flex-wrap">
              {isOwnProfile ? (
                <>
                  <Button
                    onClick={handleEditOpen}
                    className="bg-[#0c0c10] border border-[#d4a853]/30 text-[#d4a853] hover:bg-[#d4a853] hover:text-white hover:border-[#d4a853] gap-2 min-h-[44px]"
                    variant="outline"
                  >
                    <Edit3 className="w-4 h-4" strokeWidth={1.5} /> Edit Profile
                  </Button>
                  <Link href="/settings">
                    <Button
                      variant="outline"
                      className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#111118] hover:border-[#3a3a45] gap-2 min-h-[44px]"
                    >
                      <Settings className="w-4 h-4" strokeWidth={1.5} /> Settings
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleFollowToggle}
                    className={followState
                      ? 'bg-[#0c0c10] border border-[#d4a853] text-[#d4a853] hover:bg-[#d4a853] hover:text-white gap-2 min-h-[44px]'
                      : 'bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 min-h-[44px]'
                    }
                    variant={followState ? 'outline' : 'default'}
                  >
                    <Users className="w-4 h-4" strokeWidth={1.5} /> {followState ? 'Following' : 'Follow'}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#111118] hover:border-[#3a3a45] gap-2 min-h-[44px]"
                  >
                    <Mail className="w-4 h-4" strokeWidth={1.5} /> Message
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── Profile Stats Bar ─── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
            <div className="text-xl font-bold text-white">{followersCount}</div>
            <div className="text-[10px] text-[#6b7280] uppercase tracking-wider">Followers</div>
          </div>
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
            <div className="text-xl font-bold text-white">{followingCount}</div>
            <div className="text-[10px] text-[#6b7280] uppercase tracking-wider">Following</div>
          </div>
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
            <div className="text-xl font-bold text-white">{userReviewList.length}</div>
            <div className="text-[10px] text-[#6b7280] uppercase tracking-wider">Reviews</div>
          </div>
        </div>

        {/* ─── Feed Tabs ─── */}
        <div className="flex items-center border-b border-[#1e1e28] mb-6">
          <button
            onClick={() => setActiveTab('posts')}
            className={`pb-3 px-4 text-sm font-medium transition-colors flex items-center gap-2 min-h-[44px] ${
              activeTab === 'posts' ? 'text-white border-b-2 border-[#d4a853]' : 'text-[#6b7280] hover:text-[#9ca3af]'
            }`}
          >
            <Grid3x3 className="w-4 h-4" strokeWidth={1.5} /> Posts
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 px-4 text-sm font-medium transition-colors flex items-center gap-2 min-h-[44px] ${
              activeTab === 'reviews' ? 'text-white border-b-2 border-[#d4a853]' : 'text-[#6b7280] hover:text-[#9ca3af]'
            }`}
          >
            <Star className="w-4 h-4" strokeWidth={1.5} /> Reviews
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`pb-3 px-4 text-sm font-medium transition-colors flex items-center gap-2 min-h-[44px] ${
              activeTab === 'watchlist' ? 'text-white border-b-2 border-[#d4a853]' : 'text-[#6b7280] hover:text-[#9ca3af]'
            }`}
          >
            <Bookmark className="w-4 h-4" strokeWidth={1.5} /> Watchlist
          </button>
        </div>

        {/* ─── Posts Tab ─── */}
        {activeTab === 'posts' && (
          <div className="space-y-3">
            {mockPosts.map((post) => (
              <div
                key={post.id}
                className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 hover:border-[#2a2a35] transition-all group"
              >
                <h3 className="text-base font-semibold text-white group-hover:text-[#d4a853] transition-colors mb-1">
                  {post.title}
                </h3>
                <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">{post.content}</p>
                {/* Interaction bar with bold 2.5px icons */}
                <div className="h-px bg-[#1e1e28] my-3" />
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#6b7280] hover:text-[#d4a853] transition-all min-w-[44px] min-h-[44px] justify-center hover:bg-[#111118]">
                    <Heart className="w-[18px] h-[18px]" strokeWidth={1.5} />
                    <span className="text-xs font-medium">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#6b7280] hover:text-[#d4a853] transition-all min-w-[44px] min-h-[44px] justify-center hover:bg-[#111118]">
                    <MessageSquare className="w-[18px] h-[18px]" strokeWidth={1.5} />
                    <span className="text-xs font-medium">{post.comments}</span>
                  </button>
                  <span className="text-[10px] text-[#6b7280] ml-auto">{post.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Reviews Tab ─── */}
        {activeTab === 'reviews' && (
          <>
            {userReviewList.length > 0 ? (
              <div className="space-y-3">
                {userReviewList.map((review) => {
                  const movie = movies.find(m => m.id === review.movie_id);
                  return (
                    <Link
                      key={review.id}
                      href={movie?.slug ? `/movie/${movie.slug}` : '#'}
                      className="flex items-start gap-4 bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 hover:border-[#2a2a35] transition-all group"
                    >
                      {/* Movie Poster Thumbnail */}
                      <div className="w-12 h-16 rounded-lg bg-[#1e1e28] overflow-hidden flex-shrink-0">
                        {movie?.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-4 h-4 text-[#2a2a35]" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-white group-hover:text-[#d4a853] transition-colors">
                            {movie?.title || 'Unknown Movie'}
                          </span>
                          {/* Rating Badge */}
                          <span className="text-xs font-bold text-[#d4a853] bg-[#d4a853]/10 px-1.5 py-0.5 rounded">
                            {review.rating}/10
                          </span>
                        </div>
                        <p className="text-sm text-[#9ca3af] line-clamp-2">{review.text}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#6b7280]">
                          <span>{new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" strokeWidth={1.5} /> {review.helpful_count} helpful
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Star className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[#9ca3af]">No reviews yet</p>
                <p className="text-sm text-[#6b7280]">Start reviewing movies to see them here</p>
              </div>
            )}

            {/* Stats & Insights (below reviews) */}
            {userReviewList.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">Rating Distribution</h3>
                  <div className="space-y-2">
                    {ratingBuckets.reverse().map(({ rating, count }) => (
                      <div key={rating} className="flex items-center gap-2">
                        <span className="text-xs text-[#6b7280] w-6 text-right">{rating}</span>
                        <div className="flex-1 h-4 bg-[#050507] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#d4a853] rounded-full transition-all"
                            style={{ width: `${(count / maxBucket) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-[#6b7280] w-4">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">Favorite Genres</h3>
                  {topGenres.length > 0 ? (
                    <div className="space-y-3">
                      {topGenres.map(([name, count]) => (
                        <div key={name} className="flex items-center gap-3">
                          <span className="text-sm text-[#9ca3af] w-24">{name}</span>
                          <div className="flex-1 h-4 bg-[#050507] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#d4a853]/70 rounded-full transition-all"
                              style={{ width: `${(count / (topGenres[0]?.[1] || 1)) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-[#6b7280]">{count} reviews</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#6b7280]">Write reviews to see your genre preferences</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── Watchlist Tab ─── */}
        {activeTab === 'watchlist' && (
          <div className="text-center py-12">
            <ListVideo className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[#9ca3af] mb-1">{watchlistCount} movies in watchlist</p>
            <Link href="/watchlist" className="text-sm text-[#d4a853] hover:underline">View full watchlist</Link>
          </div>
        )}
      </div>

      {/* ─── Edit Profile Modal ─── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-[#0c0c10] border-[#1e1e28] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Avatar in edit modal */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-xl font-bold overflow-hidden flex-shrink-0">
                {editAvatarUrl ? (
                  <img src={editAvatarUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#111118] gap-2">
                    <Camera className="w-4 h-4" strokeWidth={1.5} /> Change Avatar
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0c0c10] border-[#1e1e28] text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white">Choose Your Avatar</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-4 gap-3 py-4">
                    {PRESET_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        onClick={() => {
                          setEditAvatarUrl(av.url);
                          setAvatarDialogOpen(false);
                        }}
                        className={`relative rounded-xl p-1 transition-all hover:scale-105 ${
                          editAvatarUrl === av.url ? 'ring-2 ring-[#d4a853] bg-[#d4a853]/10' : 'bg-[#050507] border border-[#1e1e28] hover:border-[#3a3a45]'
                        }`}
                      >
                        <img src={av.url} alt={av.label} className="w-full aspect-square rounded-lg" />
                        <span className="block text-[10px] text-[#6b7280] text-center mt-1 truncate">{av.label}</span>
                      </button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Name */}
            <div>
              <label className="text-sm font-medium text-[#9ca3af] mb-1.5 block">Display Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] min-h-[44px]"
                placeholder="Your display name"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-sm font-medium text-[#9ca3af] mb-1.5 block">Bio</label>
              <textarea
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full bg-[#050507] border border-[#1e1e28] rounded-lg py-2.5 px-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#d4a853] resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#111118]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 min-h-[44px]"
            >
              <Pencil className="w-4 h-4" strokeWidth={1.5} /> Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
