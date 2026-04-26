'use client';

import DashboardSidebar from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Activity, Star, Users, Bookmark, Film } from 'lucide-react';
import Link from 'next/link';

export default function DashboardActivityPage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <DashboardSidebar><div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-12 text-center"><p className="text-[#a0a0b0]">Please sign in to view your activity.</p><Link href="/login" className="text-[#e50914] hover:underline text-sm">Sign In</Link></div></DashboardSidebar>;
  }

  return (
    <DashboardSidebar>
      <h1 className="text-2xl font-bold text-white mb-6">Activity Feed</h1>

      <div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-12 text-center">
        <Activity className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No activity yet</h2>
        <p className="text-[#a0a0b0] mb-1">Your personal timeline will show up here.</p>
        <p className="text-sm text-[#6b6b7b]">Rate movies, write reviews, and join communities to populate your feed.</p>
      </div>
    </DashboardSidebar>
  );
}
