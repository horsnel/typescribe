'use client';

import { useEffect, useState } from 'react';
import DashboardSidebar from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Bell, Check, MessageSquare, ThumbsUp, Users, Sparkles, Shield, Star, Film, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  type: 'review' | 'community' | 'recommendation' | 'system' | 'trending';
  icon: typeof Star;
  title: string;
  message: string;
  time: string;
  color: string;
  read: boolean;
  link?: string;
}

const DEFAULT_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'trending', icon: TrendingUp, title: 'Trending Now', message: '"City of Shadows" is trending this week! See what everyone is talking about.', time: '2h ago', color: 'text-[#e50914]', read: false, link: '/movie/city-of-shadows' },
  { id: '2', type: 'review', icon: MessageSquare, title: 'New Review', message: 'Someone just reviewed "Cosmic Drift" — check out their take on the ending.', time: '4h ago', color: 'text-[#f5c518]', read: false, link: '/movie/cosmic-drift' },
  { id: '3', type: 'community', icon: Users, title: 'Community Invite', message: 'You\'ve been invited to join "Sci-Fi Nerds" — 3,200 members strong!', time: '6h ago', color: 'text-[#22c55e]', read: false, link: '/community/sci-fi-nerds' },
  { id: '4', type: 'recommendation', icon: Sparkles, title: 'Pick For You', message: 'Based on your watch history, you might love "The Harvest Home" (8.6 rating).', time: '12h ago', color: 'text-purple-400', read: true, link: '/movie/the-harvest-home' },
  { id: '5', type: 'system', icon: Shield, title: 'Welcome!', message: 'Welcome to Typescribe! Start by browsing movies and writing reviews.', time: '1d ago', color: 'text-[#3b82f6]', read: true },
  { id: '6', type: 'trending', icon: Star, title: 'Top Rated', message: '"The Harvest Home" just entered the Top 10 — currently rated 8.6 by users.', time: '2d ago', color: 'text-[#f5c518]', read: true, link: '/top-rated' },
];

export default function DashboardNotificationsPage() {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(DEFAULT_NOTIFICATIONS);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const data = localStorage.getItem('typescribe_notifications');
      if (data) setReadIds(new Set(JSON.parse(data)));
    } catch { /* ignore */ }
  }, []);

  const markAsRead = (id: string) => {
    const updated = new Set(readIds);
    updated.add(id);
    setReadIds(updated);
    localStorage.setItem('typescribe_notifications', JSON.stringify([...updated]));
  };

  const markAllRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
    localStorage.setItem('typescribe_notifications', JSON.stringify([...allIds]));
  };

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  if (!isAuthenticated) {
    return <DashboardSidebar><div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center"><p className="text-[#9ca3af]">Please sign in to view notifications.</p><Link href="/login" className="text-[#e50914] hover:underline text-sm">Sign In</Link></div></DashboardSidebar>;
  }

  return (
    <DashboardSidebar>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-[#e50914] text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllRead} variant="outline" className="border-[#1e1e28] text-[#9ca3af] hover:text-white hover:bg-[#111118] gap-2 text-sm">
            <Check className="w-4 h-4" /> Mark All Read
          </Button>
        )}
      </div>

      {/* Notification Preferences Link */}
      <div className="mb-6">
        <Link href="/dashboard/settings" className="text-sm text-[#e50914] hover:underline">Manage notification preferences</Link>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notif) => {
          const isRead = readIds.has(notif.id);
          return (
            <div
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              className={`bg-[#0c0c10] border rounded-xl p-4 flex items-start gap-4 cursor-pointer transition-colors hover:border-[#3a3a45] ${isRead ? 'border-[#1e1e28] opacity-70' : 'border-[#e50914]/20'}`}
            >
              <div className="w-10 h-10 rounded-full bg-[#111118] flex items-center justify-center flex-shrink-0">
                <notif.icon className={`w-5 h-5 ${notif.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-white">{notif.title}</p>
                  {!isRead && <span className="w-2 h-2 rounded-full bg-[#e50914] flex-shrink-0" />}
                </div>
                <p className="text-sm text-[#9ca3af]">{notif.message}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <p className="text-xs text-[#6b7280]">{notif.time}</p>
                  {notif.link && (
                    <Link href={notif.link} className="text-xs text-[#e50914] hover:underline" onClick={e => e.stopPropagation()}>
                      View →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardSidebar>
  );
}
