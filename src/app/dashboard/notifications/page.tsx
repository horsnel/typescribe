'use client';

import DashboardSidebar from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Bell, Check, MessageSquare, ThumbsUp, Users, Sparkles, Shield } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const SAMPLE_NOTIFICATIONS = [
  { type: 'system', icon: Shield, message: 'Welcome to Typescribe! Start by browsing movies and writing reviews.', time: 'Just now', color: 'text-[#3b82f6]' },
  { type: 'ai', icon: Sparkles, message: 'AI reviews are now available for trending movies.', time: '1h ago', color: 'text-[#e50914]' },
];

export default function DashboardNotificationsPage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <DashboardSidebar><div className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-12 text-center"><p className="text-[#a0a0b0]">Please sign in to view notifications.</p><Link href="/login" className="text-[#e50914] hover:underline text-sm">Sign In</Link></div></DashboardSidebar>;
  }

  return (
    <DashboardSidebar>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <Button variant="outline" className="border-[#2a2a35] text-[#a0a0b0] hover:text-white hover:bg-[#1a1a25] gap-2 text-sm">
          <Check className="w-4 h-4" /> Mark All Read
        </Button>
      </div>

      {/* Notification Preferences Link */}
      <div className="mb-6">
        <Link href="/dashboard/settings/notifications" className="text-sm text-[#e50914] hover:underline">Manage notification preferences</Link>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {SAMPLE_NOTIFICATIONS.map((notif, i) => (
          <div key={i} className="bg-[#12121a] border border-[#2a2a35] rounded-xl p-4 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full bg-[#1a1a25] flex items-center justify-center flex-shrink-0`}>
              <notif.icon className={`w-5 h-5 ${notif.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#a0a0b0]">{notif.message}</p>
              <p className="text-xs text-[#6b6b7b] mt-1">{notif.time}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardSidebar>
  );
}
