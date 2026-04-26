'use client';

import DashboardSidebar from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Bookmark, Film, Grid, List, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardWatchlistPage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <DashboardSidebar><div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-12 text-center"><p className="text-[#a0a0b0]">Please sign in to view your watchlist.</p><Link href="/login" className="text-[#e50914] hover:underline text-sm">Sign In</Link></div></DashboardSidebar>;
  }

  return (
    <DashboardSidebar>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Watchlist</h1>
        <div className="flex items-center gap-3">
          <select className="bg-[#12121a] border border-[#2a2a35] rounded-lg py-1.5 px-3 text-sm text-[#a0a0b0] focus:outline-none focus:border-[#e50914]">
            <option value="want">Want to Watch</option>
            <option value="watching">Currently Watching</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>
          <select className="bg-[#12121a] border border-[#2a2a35] rounded-lg py-1.5 px-3 text-sm text-[#a0a0b0] focus:outline-none focus:border-[#e50914]">
            <option value="date">Date Added</option>
            <option value="rating">Rating</option>
            <option value="release">Release Date</option>
          </select>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-12 text-center">
        <Bookmark className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Your watchlist is empty</h2>
        <p className="text-[#a0a0b0] mb-6">Start adding movies you want to watch.</p>
        <Link href="/browse"><Button className="bg-[#e50914] hover:bg-[#b20710] text-white gap-2"><Film className="w-4 h-4" />Browse Movies</Button></Link>
      </div>
    </DashboardSidebar>
  );
}
