'use client';

import DashboardSidebar from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Star, Users, Bookmark, MessageSquare, TrendingUp, Plus, Film, PenSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <DashboardSidebar>
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-12 text-center">
          <Film className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Sign in to access your dashboard</h2>
          <p className="text-[#a0a0b0] mb-6">Track your reviews, watchlist, and community activity.</p>
          <Link href="/login"><Button className="bg-[#e50914] hover:bg-[#b20710] text-white">Sign In</Button></Link>
        </div>
      </DashboardSidebar>
    );
  }

  const stats = [
    { label: 'Reviews Written', value: 0, icon: Star, color: 'text-[#f5c518]' },
    { label: 'Communities Joined', value: 0, icon: Users, color: 'text-[#22c55e]' },
    { label: 'Watchlist', value: 0, icon: Bookmark, color: 'text-[#e50914]' },
    { label: 'Comments', value: 0, icon: MessageSquare, color: 'text-[#3b82f6]' },
  ];

  return (
    <DashboardSidebar>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Welcome back, {user?.display_name || 'Movie Lover'}</h1>
        <p className="text-[#a0a0b0]">Here&apos;s what&apos;s happening in your Typescribe world.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-xs text-[#6b6b7b] uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6 mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/browse"><Button className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2"><Film className="w-4 h-4" />Browse Movies</Button></Link>
          <Link href="/communities"><Button variant="outline" className="border-[#2a2a35] text-white hover:bg-[#1a1a25] gap-2"><Plus className="w-4 h-4" />Create Community</Button></Link>
          <Link href="/dashboard/reviews"><Button variant="outline" className="border-[#2a2a35] text-white hover:bg-[#1a1a25] gap-2"><PenSquare className="w-4 h-4" />Write Review</Button></Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6 mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
        <div className="text-center py-8">
          <TrendingUp className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" />
          <p className="text-[#a0a0b0] mb-1">No activity yet</p>
          <p className="text-sm text-[#6b6b7b]">Start by reviewing a movie or joining a community.</p>
        </div>
      </div>

      {/* Recommended For You */}
      <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Recommended For You</h2>
        <div className="text-center py-8">
          <Star className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" />
          <p className="text-[#a0a0b0] mb-1">Personalized recommendations coming soon</p>
          <p className="text-sm text-[#6b6b7b]">Rate movies to get better suggestions.</p>
          <Link href="/browse"><Button className="mt-4 bg-[#e50914] hover:bg-[#b20710] text-white">Browse Movies</Button></Link>
        </div>
      </div>
    </DashboardSidebar>
  );
}
