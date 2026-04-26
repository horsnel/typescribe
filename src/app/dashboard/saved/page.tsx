'use client';

import DashboardSidebar from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { BookmarkCheck, Star, MessageSquare, Newspaper } from 'lucide-react';
import Link from 'next/link';

export default function DashboardSavedPage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <DashboardSidebar><div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-12 text-center"><p className="text-[#a0a0b0]">Please sign in to view your saved items.</p><Link href="/login" className="text-[#e50914] hover:underline text-sm">Sign In</Link></div></DashboardSidebar>;
  }

  return (
    <DashboardSidebar>
      <h1 className="text-2xl font-bold text-white mb-6">Saved & Bookmarks</h1>

      <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-12 text-center">
        <BookmarkCheck className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No saved items yet</h2>
        <p className="text-[#a0a0b0]">Bookmark reviews, community posts, and news articles to find them here later.</p>
      </div>
    </DashboardSidebar>
  );
}
