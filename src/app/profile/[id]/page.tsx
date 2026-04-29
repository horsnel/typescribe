'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Film, Star, Users, Edit3, Mail, Heart, MessageSquare,
  Bookmark, TrendingUp, Camera, Settings, ArrowLeft, Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { ProfileSkeleton } from '@/components/skeletons/CommunitySkeleton';
import { isFollowing, toggleFollow, getFollowerCount, getFollowingCount, getMockUserById, type MockUser } from '@/lib/community-storage';

export default function PublicProfilePage() {
  const params = useParams();
  const userId = Number(params.id);
  const { user: currentUser, isAuthenticated } = useAuth();

  const [profileUser, setProfileUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followState, setFollowState] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reviews'>('posts');

  useEffect(() => {
    const mockUser = getMockUserById(userId);
    setProfileUser(mockUser || null);
    if (mockUser) {
      setFollowState(isFollowing(mockUser.id));
    }
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, [userId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050507] pt-8 pb-16">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  // If this is the current logged-in user, redirect to own profile
  const isOwnProfile = currentUser && currentUser.id === userId;

  if (isOwnProfile) {
    return (
      <div className="min-h-screen bg-[#050507] pt-8 pb-16">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="text-[#9ca3af] mb-4">This is your profile!</p>
          <Link href="/profile">
            <Button className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2">
              <Edit3 className="w-4 h-4" /> Go to My Profile
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-[#050507] pt-8 pb-16">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 text-center">
          <Users className="w-16 h-16 text-[#2a2a35] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">User not found</h2>
          <p className="text-[#6b7280] mb-6">This profile doesn&apos;t exist or has been removed.</p>
          <Link href="/communities">
            <Button className="bg-[#d4a853] hover:bg-[#b8922e] text-white">Browse Communities</Button>
          </Link>
        </div>
      </div>
    );
  }

  const userInitials = profileUser.display_name
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const followersCount = getFollowerCount(profileUser.id);
  const followingCount = getFollowingCount(profileUser.id);

  const handleFollowToggle = () => {
    const nowFollowing = toggleFollow(profileUser.id);
    setFollowState(nowFollowing);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${profileUser.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${profileUser.display_name} on Typescribe`, url }); } catch { /* cancelled */ }
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
        <Link href="/communities" className="inline-flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#d4a853] transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* ─── Profile Header ─── */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6 pt-4">
          {/* Avatar */}
          <div className="relative group flex-shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-3xl font-bold overflow-hidden ring-4 ring-[#d4a853]/20">
              {profileUser.avatar ? (
                <img src={profileUser.avatar} alt={profileUser.display_name} className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
            {/* Creator badge */}
            {profileUser.isCreator && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#d4a853] rounded-full flex items-center justify-center shadow-lg border-2 border-[#050507]">
                <Crown className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
              <h1 className="text-2xl font-extrabold text-white">{profileUser.display_name}</h1>
              {profileUser.isCreator && (
                <span className="text-[10px] text-[#050507] bg-[#d4a853] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Creator</span>
              )}
            </div>
            <p className="text-sm text-[#9ca3af] leading-relaxed max-w-md mb-3">{profileUser.bio || 'No bio yet.'}</p>

            {/* Favorite Genres */}
            {profileUser.favorite_genres.length > 0 && (
              <div className="flex items-center gap-2 mb-3 flex-wrap justify-center sm:justify-start">
                <Film className="w-3.5 h-3.5 text-[#d4a853]" strokeWidth={1.5} />
                {profileUser.favorite_genres.map((genre) => (
                  <span key={genre} className="text-xs text-[#d4a853] bg-[#d4a853]/10 px-2 py-0.5 rounded-full">{genre}</span>
                ))}
              </div>
            )}

            {/* Created Communities */}
            {profileUser.createdCommunities.length > 0 && (
              <div className="flex items-center gap-2 mb-3 flex-wrap justify-center sm:justify-start">
                <Crown className="w-3.5 h-3.5 text-[#d4a853]" strokeWidth={1.5} />
                {profileUser.createdCommunities.map((cid) => (
                  <Link key={cid} href={`/community/${cid}`} className="text-xs text-[#d4a853] bg-[#d4a853]/10 px-2 py-0.5 rounded-full hover:bg-[#d4a853]/20 transition-colors">
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
                      ? 'bg-[#0c0c10] border border-[#d4a853] text-[#d4a853] hover:bg-[#d4a853] hover:text-white gap-2 min-h-[44px]'
                      : 'bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 min-h-[44px]'
                    }
                    variant={followState ? 'outline' : 'default'}
                  >
                    <Users className="w-4 h-4" /> {followState ? 'Following' : 'Follow'}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#111118] hover:border-[#3a3a45] gap-2 min-h-[44px]"
                  >
                    <Mail className="w-4 h-4" /> Message
                  </Button>
                </>
              ) : (
                <Link href="/login">
                  <Button className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 min-h-[44px]">
                    <Users className="w-4 h-4" /> Sign in to Follow
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
            <div className="text-xl font-bold text-white">{profileUser.reviewCount}</div>
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
            <MessageSquare className="w-4 h-4" strokeWidth={1.5} /> Posts
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 px-4 text-sm font-medium transition-colors flex items-center gap-2 min-h-[44px] ${
              activeTab === 'reviews' ? 'text-white border-b-2 border-[#d4a853]' : 'text-[#6b7280] hover:text-[#9ca3af]'
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
                  <span className="text-[10px] text-[#d4a853] bg-[#d4a853]/10 px-2 py-0.5 rounded-full">{post.community}</span>
                  <span className="text-[10px] text-[#6b7280]">{post.time}</span>
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-[#d4a853] transition-colors mb-1">{post.title}</h3>
                <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">{post.content}</p>
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
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Reviews Tab ─── */}
        {activeTab === 'reviews' && (
          <div className="text-center py-12">
            <Star className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" />
            <p className="text-[#9ca3af]">{profileUser.reviewCount} reviews written</p>
            <p className="text-sm text-[#6b7280] mt-1">Follow this user to see their reviews in your feed</p>
          </div>
        )}
      </div>
    </div>
  );
}
