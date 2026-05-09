'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Activity, Star, Users, Bookmark, Film, MessageSquare, PenSquare } from 'lucide-react';
import Link from 'next/link';

interface ActivityEntry {
  id: string;
  type: 'review' | 'watchlist_add' | 'community_join' | 'comment';
  description: string;
  timestamp: string;
  link?: string;
}

export default function DashboardActivityPage() {
  const { user, isAuthenticated } = useAuth();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    const all: ActivityEntry[] = [];

    // Reviews
    try {
      const data = localStorage.getItem('typescribe_reviews');
      const reviews = data ? JSON.parse(data) : [];
      reviews.forEach((r: any) => {
        all.push({
          id: `review-${r.id}`,
          type: 'review',
          description: `Wrote a review for "${r.movie_title || 'Movie #' + r.movie_id}" — rated ${r.rating}/10`,
          timestamp: r.created_at,
          link: r.movie_slug ? `/movie/${r.movie_slug}` : undefined,
        });
      });
    } catch { /* ignore */ }

    // Watchlist
    try {
      const data = localStorage.getItem('typescribe_watchlist');
      const items = data ? JSON.parse(data) : [];
      items.forEach((w: any) => {
        all.push({
          id: `watchlist-${w.movieId}`,
          type: 'watchlist_add',
          description: `Added "${w.title || 'Movie #' + w.movieId}" to watchlist`,
          timestamp: w.addedDate,
          link: w.slug ? `/movie/${w.slug}` : undefined,
        });
      });
    } catch { /* ignore */ }

    // Communities
    try {
      const data = localStorage.getItem('typescribe_joined_communities');
      const ids: string[] = data ? JSON.parse(data) : [];
      ids.forEach((id, i) => {
        all.push({
          id: `community-${id}`,
          type: 'community_join',
          description: `Joined a community`,
          timestamp: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
          link: `/community/${id}`,
        });
      });
    } catch { /* ignore */ }

    // Sort by timestamp
    all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivities(all);
  }, []);

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

  const getIcon = (type: string) => {
    switch (type) {
      case 'review': return Star;
      case 'watchlist_add': return Bookmark;
      case 'community_join': return Users;
      default: return Activity;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'review': return 'text-[#D4A853]';
      case 'watchlist_add': return 'text-[#D4A853]';
      case 'community_join': return 'text-[#22c55e]';
      default: return 'text-[#3b82f6]';
    }
  };

  if (!isAuthenticated) {
    return <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center"><p className="text-[#9ca3af]">Please sign in to view your activity.</p><Link href="/login" className="text-[#D4A853] hover:underline text-sm">Sign In</Link></div>;
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-6">Activity Feed</h1>

      {activities.length === 0 ? (
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center">
          <Activity className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-white mb-2">No activity yet</h2>
          <p className="text-[#9ca3af] mb-1">Your personal timeline will show up here.</p>
          <p className="text-sm text-[#6b7280]">Rate movies, write reviews, and join communities to populate your feed.</p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <Link href="/browse" className="text-[#D4A853] hover:underline text-sm">Browse Movies</Link>
            <Link href="/communities" className="text-[#D4A853] hover:underline text-sm">Find Communities</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((item) => {
            const Icon = getIcon(item.type);
            const color = getColor(item.type);
            return (
              <div key={item.id} className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 flex items-start gap-4 hover:border-[#3a3a45] transition-colors">
                <div className="w-10 h-10 rounded-full bg-[#111118] flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#9ca3af]">{item.description}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-[#6b7280]">{formatTimeAgo(item.timestamp)}</span>
                    {item.link && (
                      <Link href={item.link} className="text-xs text-[#D4A853] hover:underline">View →</Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
