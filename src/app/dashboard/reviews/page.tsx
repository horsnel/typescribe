'use client';

import DashboardSidebar from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Star, Film, Filter, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardReviewsPage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <DashboardSidebar><div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-12 text-center"><p className="text-[#a0a0b0]">Please sign in to view your reviews.</p><Link href="/login" className="text-[#e50914] hover:underline text-sm">Sign In</Link></div></DashboardSidebar>;
  }

  return (
    <DashboardSidebar>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">My Reviews</h1>
        <div className="flex items-center gap-3">
          <select className="bg-[#12121a] border border-[#2a2a35] rounded-lg py-1.5 px-3 text-sm text-[#a0a0b0] focus:outline-none focus:border-[#e50914]">
            <option value="all">All Types</option>
            <option value="movie">Movies</option>
            <option value="tv">Series</option>
            <option value="anime">Anime</option>
          </select>
          <select className="bg-[#12121a] border border-[#2a2a35] rounded-lg py-1.5 px-3 text-sm text-[#a0a0b0] focus:outline-none focus:border-[#e50914]">
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-xs text-[#6b6b7b]">Total Reviews</p>
        </div>
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">--</p>
          <p className="text-xs text-[#6b6b7b]">Average Rating</p>
        </div>
        <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-xs text-[#6b6b7b]">Most Reviewed Genre</p>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-12 text-center">
        <Star className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No reviews yet</h2>
        <p className="text-[#a0a0b0] mb-6">Share your opinions and help others discover great movies.</p>
        <Link href="/browse"><Button className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2"><Film className="w-4 h-4" />Browse Movies to Review</Button></Link>
      </div>
    </DashboardSidebar>
  );
}
