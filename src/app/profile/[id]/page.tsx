'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Film, Star, Users, Edit3, Mail, Heart, MessageSquare,
  Bookmark, TrendingUp, Camera, Settings, ArrowLeft, Crown, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { ProfileSkeleton } from '@/components/skeletons/CommunitySkeleton';
import { isFollowing, toggleFollow, getFollowerCount, getFollowingCount, getMockUserById, type MockUser } from '@/lib/community-storage';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PublicReview {
  id: string;
  movie_id: number;
  movie_title: string;
  poster_path?: string | null;
  rating: number;
  title?: string | null;
  body?: string | null;
  spoiler?: boolean;
  genres?: string[] | null;
  release_year?: number | null;
  created_at: string;
  author?: {
    id: string;
    display_name: string;
    avatar?: string | null;
  } | null;
}

export default function PublicProfilePage() {
  const params = useParams();
  const rawId = String(params.id ?? '');
  const isUuid = UUID_RE.test(rawId);
  const userId = Number(params.id);
  const { user: currentUser, isAuthenticated } = useAuth();

  const [profileUser, setProfileUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followState, setFollowState] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reviews'>('posts');
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');

  useEffect(() => {
    const mockUser = getMockUserById(userId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state with external system on mount
    setProfileUser(mockUser || null);
    if (mockUser) {
      setFollowState(isFollowing(mockUser.id));
    }
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, [userId]);

  // Fetch real reviews when the param is a UUID (i.e. a real Supabase user).
  // Numeric IDs fall back to the existing mock layer and never hit this path,
  // so we skip the effect entirely (avoids an unnecessary setState-in-effect
  // that the React Compiler flags).
  useEffect(() => {
    if (!isUuid) return;
    let cancelled = false;
    // Reset loading/error state before the new fetch. setState-in-effect is
    // intentional here — we're synchronizing React state with the URL param
    // (a "reset state when prop changes" pattern explicitly allowed by the
    // React docs).
     
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading state before async fetch (React docs: 'You Might Not Need an Effect' § fetch-on-mount)
    setReviewsLoading(true);
     
    setReviewsError('');
    fetch(`/api/reviews?user_id=${encodeURIComponent(rawId)}&limit=50`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data?.error ?? `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setReviews(data?.reviews ?? []);
      })
      .catch((err) => {
        if (!cancelled) setReviewsError(err?.message ?? 'Failed to load reviews');
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => { cancelled = true; };
  }, [isUuid, rawId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050507] pt-8 pb-16">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  // If this is the current logged-in user, redirect to own profile.
  // Compare as strings so UUIDs match (currentUser.id is a UUID string).
  const isOwnProfile = !!currentUser && String(currentUser.id) === rawId;

  if (isOwnProfile) {
    return (
      <div className="min-h-screen bg-[#050507] pt-8 pb-16">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="text-[#9ca3af] mb-4">This is your profile!</p>
          <Link href="/profile">
            <Button className="bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2">
              <Edit3 className="w-4 h-4" strokeWidth={1.5} /> Go to My Profile
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!profileUser && !isUuid) {
    return (
      <div className="min-h-screen bg-[#050507] pt-8 pb-16">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 text-center">
          <Users className="w-16 h-16 text-[#2a2a35] mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-white mb-2">User not found</h2>
          <p className="text-[#6b7280] mb-6">This profile doesn&apos;t exist or has been removed.</p>
          <Link href="/communities">
            <Button className="bg-[#D4A853] hover:bg-[#B8922F] text-white">Browse Communities</Button>
          </Link>
        </div>
      </div>
    );
  }

  // When the URL is a real Supabase UUID (not a mock numeric ID), we may not
  // have a mock profile to render. If we've already fetched reviews, prefer
  // the `author` join from the first review (real Supabase data) so the
  // header shows the user's actual display_name + avatar instead of a
  // generic "Cinephile" fallback. Falls back to a minimal stub only when
  // no reviews are available yet.
  const authorFromReviews = reviews[0]?.author;
  const effectiveUser: MockUser = profileUser ?? {
    id: 0,
    display_name: authorFromReviews?.display_name ?? 'Cinephile',
    avatar: authorFromReviews?.avatar ?? '',
    bio: '',
    favorite_genres: [],
    created_at: new Date().toISOString(),
    reviewCount: 0,
    isCreator: false,
    createdCommunities: [],
  };

  const userInitials = effectiveUser.display_name
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const followersCount = profileUser ? getFollowerCount(profileUser.id) : 0;
  const followingCount = profileUser ? getFollowingCount(profileUser.id) : 0;

  const handleFollowToggle = () => {
    if (!profileUser) return;
    const nowFollowing = toggleFollow(profileUser.id);
    setFollowState(nowFollowing);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${rawId}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${effectiveUser.display_name} on Typescribe`, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  // Mock posts by this user
  const mockPosts = [
    { id: '1', title: 'What horror movie genuinely scared you the most?', content: 'I watched The Silent Dwelling last night and could not sleep. What movie genuinely terrified you?', likes: 89, comments: 45, time: '3mo ago', community: 'Horror Fans' },
    { id: '2', title: 'Best directors working today?', content: 'Looking for recommendations from the best directors. My picks: Ari Aster, Jordan Peele.', likes: 67, comments: 32, time: '4mo ago', community: 'Horror Fans' },
  ];

  return (
    <div className="min-h-screen bg-[#050507] pt-4 pb-16">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-4">
        {/* Back link */}
        <Link href="/communities" className="inline-flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#D4A853] transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Back
        </Link>

        {/* ─── Profile Header ─── */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6 pt-4">
          {/* Avatar */}
          <div className="relative group flex-shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-[#D4A853] to-[#B8922F] flex items-center justify-center text-white text-3xl font-bold overflow-hidden ring-4 ring-[#D4A853]/20">
              {effectiveUser.avatar ? (
                <img src={effectiveUser.avatar} alt={effectiveUser.display_name} className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
            {/* Creator badge */}
            {effectiveUser.isCreator && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#D4A853] rounded-full flex items-center justify-center shadow-lg border-2 border-[#050507]">
                <Crown className="w-4 h-4 text-white" strokeWidth={1.5} />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
              <h1 className="text-2xl font-extrabold text-white">{effectiveUser.display_name}</h1>
              {effectiveUser.isCreator && (
                <span className="text-[10px] text-[#050507] bg-[#D4A853] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Creator</span>
              )}
            </div>
            <p className="text-sm text-[#9ca3af] leading-relaxed max-w-md mb-3">{effectiveUser.bio || 'No bio yet.'}</p>

            {/* Favorite Genres */}
            {effectiveUser.favorite_genres.length > 0 && (
              <div className="flex items-center gap-2 mb-3 flex-wrap justify-center sm:justify-start">
                <Film className="w-3.5 h-3.5 text-[#D4A853]" strokeWidth={1.5} />
                {effectiveUser.favorite_genres.map((genre) => (
                  <span key={genre} className="text-xs text-[#D4A853] bg-[#D4A853]/10 px-2 py-0.5 rounded-full">{genre}</span>
                ))}
              </div>
            )}

            {/* Created Communities */}
            {effectiveUser.createdCommunities.length > 0 && (
              <div className="flex items-center gap-2 mb-3 flex-wrap justify-center sm:justify-start">
                <Crown className="w-3.5 h-3.5 text-[#D4A853]" strokeWidth={1.5} />
                {effectiveUser.createdCommunities.map((cid) => (
                  <Link key={cid} href={`/community/${cid}`} className="text-xs text-[#D4A853] bg-[#D4A853]/10 px-2 py-0.5 rounded-full hover:bg-[#D4A853]/20 transition-colors">
                    {cid.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Link>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 justify-center sm:justify-start flex-wrap">
              {isAuthenticated ? (
                <>
                  <Button
                    onClick={handleFollowToggle}
                    className={followState
                      ? 'bg-[#0c0c10] border border-[#D4A853] text-[#D4A853] hover:bg-[#D4A853] hover:text-white gap-2 min-h-[44px]'
                      : 'bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2 min-h-[44px]'
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
              ) : (
                <Link href="/login">
                  <Button className="bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2 min-h-[44px]">
                    <Users className="w-4 h-4" strokeWidth={1.5} /> Sign in to Follow
                  </Button>
                </Link>
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
            <div className="text-xl font-bold text-white">{isUuid ? reviews.length : (profileUser?.reviewCount ?? 0)}</div>
            <div className="text-[10px] text-[#6b7280] uppercase tracking-wider">Reviews</div>
          </div>
        </div>

        {/* ─── Feed Tabs ─── */}
        <div className="flex items-center border-b border-[#1e1e28] mb-6">
          <button
            onClick={() => setActiveTab('posts')}
            className={`pb-3 px-4 text-sm font-medium transition-colors flex items-center gap-2 min-h-[44px] ${
              activeTab === 'posts' ? 'text-white border-b-2 border-[#D4A853]' : 'text-[#6b7280] hover:text-[#9ca3af]'
            }`}
          >
            <MessageSquare className="w-4 h-4" strokeWidth={1.5} /> Posts
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 px-4 text-sm font-medium transition-colors flex items-center gap-2 min-h-[44px] ${
              activeTab === 'reviews' ? 'text-white border-b-2 border-[#D4A853]' : 'text-[#6b7280] hover:text-[#9ca3af]'
            }`}
          >
            <Star className="w-4 h-4" strokeWidth={1.5} /> Reviews
          </button>
        </div>

        {/* ─── Posts Tab ─── */}
        {activeTab === 'posts' && (
          <div className="space-y-3">
            {mockPosts.map((post) => (
              <div key={post.id} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 hover:border-[#2a2a35] transition-all group">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-[#D4A853] bg-[#D4A853]/10 px-2 py-0.5 rounded-full">{post.community}</span>
                  <span className="text-[10px] text-[#6b7280]">{post.time}</span>
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-[#D4A853] transition-colors mb-1">{post.title}</h3>
                <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">{post.content}</p>
                <div className="h-px bg-[#1e1e28] my-3" />
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#6b7280] hover:text-[#D4A853] transition-all min-w-[44px] min-h-[44px] justify-center hover:bg-[#111118]">
                    <Heart className="w-[18px] h-[18px]" strokeWidth={1.5} />
                    <span className="text-xs font-medium">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#6b7280] hover:text-[#D4A853] transition-all min-w-[44px] min-h-[44px] justify-center hover:bg-[#111118]">
                    <MessageSquare className="w-[18px] h-[18px]" strokeWidth={1.5} />
                    <span className="text-xs font-medium">{post.comments}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Reviews Tab ─── */}
        {activeTab === 'reviews' && (
          <div>
            {/* Loading state */}
            {reviewsLoading && (
              <div className="flex items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 text-[#D4A853] animate-spin" strokeWidth={1.5} />
                <span className="text-sm text-[#6b7280]">Loading reviews…</span>
              </div>
            )}

            {/* Error state */}
            {!reviewsLoading && reviewsError && (
              <div className="text-center py-12">
                <Star className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[#9ca3af]">Couldn&apos;t load reviews</p>
                <p className="text-sm text-[#6b7280] mt-1">{reviewsError}</p>
              </div>
            )}

            {/* Empty state (numeric mock ID — never fetches from API) */}
            {!reviewsLoading && !reviewsError && reviews.length === 0 && (
              <div className="text-center py-12">
                <Star className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[#9ca3af]">
                  {isUuid ? 'No reviews yet' : `${profileUser?.reviewCount ?? 0} reviews written`}
                </p>
                <p className="text-sm text-[#6b7280] mt-1">
                  {isUuid
                    ? 'When this user writes a review, it will appear here.'
                    : 'Follow this user to see their reviews in your feed'}
                </p>
              </div>
            )}

            {/* Reviews list */}
            {!reviewsLoading && !reviewsError && reviews.length > 0 && (
              <div className="space-y-3">
                {reviews.map((review) => {
                  const ratingColor = review.rating >= 8
                    ? 'text-green-400 bg-green-500/10'
                    : review.rating >= 5
                      ? 'text-yellow-400 bg-yellow-500/10'
                      : 'text-red-400 bg-red-500/10';
                  const movieSlug = review.movie_title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');
                  return (
                    <div key={review.id} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 hover:border-[#3a3a45] transition-colors flex items-start gap-4">
                      {review.poster_path ? (
                        <img
                          src={review.poster_path.startsWith('http')
                            ? review.poster_path
                            : `https://image.tmdb.org/t/p/w185${review.poster_path}`}
                          alt={review.movie_title}
                          className="w-12 h-18 object-cover rounded-md flex-shrink-0 bg-[#1a1a22]"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-12 h-18 bg-[#1a1a22] rounded-md flex-shrink-0 flex items-center justify-center">
                          <Film className="w-4 h-4 text-[#3a3a45]" strokeWidth={1.5} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Link
                            href={`/movie/${encodeURIComponent(movieSlug)}-${review.movie_id}`}
                            className="text-sm font-semibold text-white truncate hover:text-[#D4A853] transition-colors"
                          >
                            {review.movie_title || `Movie #${review.movie_id}`}
                          </Link>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${ratingColor}`}>
                            <Star className="w-3 h-3 fill-current" strokeWidth={1.5} />
                            <span className="text-xs font-bold">{review.rating}/10</span>
                          </div>
                          {review.spoiler && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/20">
                              SPOILER
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6b7280] mb-2">
                          {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {review.title ? <> · <span className="text-[#9ca3af] italic">{review.title}</span></> : null}
                        </p>
                        <p className="text-sm text-[#9ca3af] leading-relaxed line-clamp-3">{review.body ?? ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
