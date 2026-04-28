'use client';

import DashboardSidebar from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Bell, Mail, Star, Users, Sparkles, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NOTIFICATION_TYPES = [
  { key: 'weekly_recos', label: 'Weekly movie recommendations email', icon: Mail, default: true },
  { key: 'new_releases', label: 'New releases in my favorite genres', icon: Star, default: true },
  { key: 'review_replies', label: 'Someone replies to my review', icon: Star, default: true },
  { key: 'review_helpful', label: 'Someone finds my review helpful', icon: Star, default: true },
  { key: 'community_posts', label: 'New posts in my communities', icon: Users, default: false },
  { key: 'ai_updates', label: 'AI review updates for movies I\'ve watched', icon: Sparkles, default: false },
  { key: 'marketing', label: 'Marketing and promotional emails', icon: Megaphone, default: false },
];

export default function DashboardSettingsNotificationsPage() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <DashboardSidebar><div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center"><p className="text-[#9ca3af]">Please sign in to access settings.</p></div></DashboardSidebar>;
  }

  return (
    <DashboardSidebar>
      <h1 className="text-2xl font-bold text-white mb-6">Notification Preferences</h1>

      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-6">
        <p className="text-sm text-[#9ca3af] mb-6">Choose which notifications you want to receive. You can change these at any time.</p>
        <div className="space-y-4">
          {NOTIFICATION_TYPES.map((notif) => (
            <div key={notif.key} className="flex items-center justify-between py-2 border-b border-[#1e1e28]/50 last:border-0">
              <div className="flex items-center gap-3">
                <notif.icon className="w-4 h-4 text-[#6b7280]" />
                <span className="text-sm text-white">{notif.label}</span>
              </div>
              <button className={`w-12 h-6 rounded-full relative transition-colors ${notif.default ? 'bg-[#d4a853]' : 'bg-[#2a2a35]'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notif.default ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>
        <Button className="mt-6 bg-[#d4a853] hover:bg-[#b8922e] text-white">Save Preferences</Button>
      </div>
    </DashboardSidebar>
  );
}
