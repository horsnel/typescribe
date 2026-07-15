'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Star, Users, Bookmark, MessageSquare, TrendingUp, Plus, Film, PenSquare, Clock, Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import RecommendedForYou from '@/components/dashboard/RecommendedForYou';

interface Review {
  id: string;
  movie_id: number;
  movie_title: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  created_at: string;
}

interface WatchlistItem {
  movieId: number;
  title?: string;
  addedDate: string;
}

interface ActivityItem {
  id: string;
  type: 'review' | 'watchlist' | 'community';
  description: string;
  timestamp: string;
  icon: typeof Star;
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [reviewCount, setReviewCount] = useState(0);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [communityCount, setCommunityCount] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Reviews — fetch from API (authoritative source)
      let reviews: Review[] = [];
      try {
        const res = await fetch('/api/reviews?limit=100', { cache: 'no-store' });
        if (res.ok) {
          reviews = (await res.json()).reviews ?? [];
        }
      } catch { /* ignore */ }

      // 2. Watchlist + Communities — local-only features (no API yet)
      let watchlist: WatchlistItem[] = [];
      try {
        const watchlistData = localStorage.getItem('typescribe_watchlist');
        watchlist = watchlistData ? JSON.parse(watchlistData) : [];
      } catch { /* ignore */ }

      let communities: string[] = [];
      try {
        const communitiesData = localStorage.getItem('typescribe_joined_communities');
        communities = communitiesData ? JSON.parse(communitiesData) : [];
      } catch { /* ignore */ }

      if (cancelled) return;

      setReviewCount(reviews.length);
      setWatchlistCount(watchlist.length);
      setCommunityCount(communities.length);

      if (reviews.length > 0) {
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        setAvgRating(Math.round(avg * 10) / 10);
      }

      // Build recent activity feed from real data sources
      const activity: ActivityItem[] = [];
      reviews.slice(0, 5).forEach(r => {
        activity.push({
          id: `review-${r.id}`,
          type: 'review',
          description: `Reviewed "${r.movie_title || 'Movie #' + r.movie_id}" — rated ${r.rating}/10`,
          timestamp: r.created_at,
          icon: Star,
        });
      });
      watchlist.slice(0, 5).forEach(w => {
        activity.push({
          id: `watchlist-${w.movieId}`,
          type: 'watchlist',
          description: `Added "${w.title || 'Movie #' + w.movieId}" to watchlist`,
          timestamp: w.addedDate,
          icon: Bookmark,
        });
      });
      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activity.slice(0, 6));
      setLoading(false);
    }

    if (isAuthenticated) {
      load();
    } else {
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center">
        <Film className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" strokeWidth={1.5} />
        <h2 className="text-xl font-bold text-white mb-2">Sign in to access your dashboard</h2>
        <p className="text-[#9ca3af] mb-6">Track your reviews, watchlist, and community activity.</p>
        <Link href="/login"><Button className="bg-[#D4A853] hover:bg-[#B8922F] text-white">Sign In</Button></Link>
      </div>
    );
  }

  const stats = [
    { label: 'Reviews Written', value: reviewCount, icon: Star, color: 'text-[#D4A853]' },
    { label: 'Movies Watched', value: reviewCount + watchlistCount, icon: Eye, color: 'text-[#3b82f6]' },
    { label: 'Watchlist', value: watchlistCount, icon: Bookmark, color: 'text-[#D4A853]' },
    { label: 'Communities', value: communityCount, icon: Users, color: 'text-[#22c55e]' },
  ];

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

  return (
    <>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Welcome back, {user?.display_name || 'Movie Lover'}</h1>
        <p className="text-[#9ca3af]">Here&apos;s what&apos;s happening in your Typescribe world.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 hover:border-[#3a3a45] transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-xs text-[#6b7280] uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6 mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/browse"><Button className="bg-[#D4A853] hover:bg-[#B8922F] text-white gap-2"><Film className="w-4 h-4" strokeWidth={1.5} />Browse Movies</Button></Link>
          <Link href="/communities"><Button variant="outline" className="border-[#1e1e28] text-white hover:bg-[#111118] gap-2"><Plus className="w-4 h-4" strokeWidth={1.5} />Create Community</Button></Link>
          <Link href="/dashboard/reviews"><Button variant="outline" className="border-[#1e1e28] text-white hover:bg-[#111118] gap-2"><PenSquare className="w-4 h-4" strokeWidth={1.5} />Write Review</Button></Link>
          <Link href="/dashboard/watchlist"><Button variant="outline" className="border-[#1e1e28] text-white hover:bg-[#111118] gap-2"><Bookmark className="w-4 h-4" strokeWidth={1.5} />My Watchlist</Button></Link>
        </div>
      </div>

      {/* Two columns: Recent Activity + Rating Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Activity */}
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <div className="text-center py-6">
              <TrendingUp className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[#9ca3af] mb-1">No activity yet</p>
              <p className="text-sm text-[#6b7280]">Start by reviewing a movie or joining a community.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-[#1e1e28]/50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-[#111118] flex items-center justify-center flex-shrink-0">
                    <item.icon className={`w-4 h-4 ${item.type === 'review' ? 'text-[#D4A853]' : 'text-[#D4A853]'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#9ca3af] truncate">{item.description}</p>
                  </div>
                  <span className="text-xs text-[#6b7280] flex-shrink-0">{formatTimeAgo(item.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rating Summary */}
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Your Rating Summary</h2>
          {avgRating !== null ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-5xl font-bold text-[#D4A853]">{avgRating}</p>
                <p className="text-sm text-[#6b7280] mt-1">Average Rating</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#050507] rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-white">{reviewCount}</p>
                  <p className="text-xs text-[#6b7280]">Total Reviews</p>
                </div>
                <div className="bg-[#050507] rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-white">{watchlistCount}</p>
                  <p className="text-xs text-[#6b7280]">In Watchlist</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Star className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[#9ca3af] mb-1">No ratings yet</p>
              <p className="text-sm text-[#6b7280]">Rate movies to see your summary.</p>
              <Link href="/browse"><Button className="mt-3 bg-[#D4A853] hover:bg-[#B8922F] text-white text-sm">Browse Movies</Button></Link>
            </div>
          )}
        </div>
      </div>

      {/* Recommended For You — drives /api/vibe-search from /api/taste-dna */}
      <RecommendedForYou />
    </>
  );
}
