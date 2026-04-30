'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Check, X, MessageSquare, ThumbsUp, Users, Sparkles, Shield, Star, Film, TrendingUp, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getMyActivityFeed,
  getUnreadCount,
  markActivitiesRead,
  getJoinedCommunities,
  timeAgo,
  type ActivityItem,
  type ActivityType,
} from '@/lib/community-storage';

/* ──────────────────────────────────────────────
   Context — any component can open the panel
   ────────────────────────────────────────────── */
import { createContext, useContext, useCallback } from 'react';

type PanelCtx = { openPanel: () => void; closePanel: () => void };
const Ctx = createContext<PanelCtx>({ openPanel() {}, closePanel() {} });
export const useNotificationPanel = () => useContext(Ctx);
export const NotificationPanelProvider = Ctx.Provider;

/* ──────────────────────────────────────────────
   Static system notifications (same as old page)
   ────────────────────────────────────────────── */
interface SystemNotification {
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

const SYSTEM_NOTIFICATIONS: SystemNotification[] = [
  { id: 's1', type: 'trending', icon: TrendingUp, title: 'Trending Now', message: '"City of Shadows" is trending this week! See what everyone is talking about.', time: '2h ago', color: 'text-[#d4a853]', read: false, link: '/movie/city-of-shadows' },
  { id: 's2', type: 'review', icon: MessageSquare, title: 'New Review', message: 'Someone just reviewed "Cosmic Drift" — check out their take on the ending.', time: '4h ago', color: 'text-[#f5c518]', read: false, link: '/movie/cosmic-drift' },
  { id: 's3', type: 'community', icon: Users, title: 'Community Invite', message: 'You\'ve been invited to join "Sci-Fi Nerds" — 3,200 members strong!', time: '6h ago', color: 'text-[#22c55e]', read: false, link: '/community/sci-fi-nerds' },
  { id: 's4', type: 'recommendation', icon: Sparkles, title: 'Pick For You', message: 'Based on your watch history, you might love "The Harvest Home" (8.6 rating).', time: '12h ago', color: 'text-purple-400', read: true, link: '/movie/the-harvest-home' },
  { id: 's5', type: 'system', icon: Shield, title: 'Welcome!', message: 'Welcome to Typescribe! Start by browsing movies and writing reviews.', time: '1d ago', color: 'text-[#3b82f6]', read: true },
  { id: 's6', type: 'trending', icon: Star, title: 'Top Rated', message: '"The Harvest Home" just entered the Top 10 — currently rated 8.6 by users.', time: '2d ago', color: 'text-[#f5c518]', read: true, link: '/top-rated' },
];

/* ──────────────────────────────────────────────
   Activity verb labels
   ────────────────────────────────────────────── */
const ACTIVITY_VERBS: Record<ActivityType, string> = {
  'new_post': 'posted in',
  'new_comment': 'commented in',
  'new_debate': 'started a debate in',
  'new_member': 'joined',
  'weekly_theme': 'new theme in',
  'watchlist_vote': 'voted in',
  'like': 'liked a post in',
};

/* ──────────────────────────────────────────────
   Tab type
   ────────────────────────────────────────────── */
type Tab = 'activity' | 'all';

/* ──────────────────────────────────────────────
   The Panel Component
   ────────────────────────────────────────────── */
export default function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('activity');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  // Load read state from localStorage
  useEffect(() => {
    try {
      const data = localStorage.getItem('typescribe_notifications');
      if (data) setReadIds(new Set(JSON.parse(data)));
    } catch { /* ignore */ }
  }, []);

  // Poll for unread count
  useEffect(() => {
    const update = () => setUnread(getUnreadCount());
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load activities when panel opens
  useEffect(() => {
    if (isOpen) {
      const joined = getJoinedCommunities();
      setActivities(getMyActivityFeed(joined, 20));
      setUnread(getUnreadCount());
    }
  }, [isOpen]);

  // Escape key closes panel
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Listen for custom open event
  useEffect(() => {
    function handleOpen() { setIsOpen(true); }
    window.addEventListener('open-notification-panel', handleOpen);
    return () => window.removeEventListener('open-notification-panel', handleOpen);
  }, []);

  const close = () => setIsOpen(false);

  const open = () => setIsOpen(true);

  const markAsRead = (id: string) => {
    const updated = new Set(readIds);
    updated.add(id);
    setReadIds(updated);
    localStorage.setItem('typescribe_notifications', JSON.stringify([...updated]));
  };

  const markAllSystemRead = () => {
    const allIds = new Set(SYSTEM_NOTIFICATIONS.map(n => n.id));
    setReadIds(allIds);
    localStorage.setItem('typescribe_notifications', JSON.stringify([...allIds]));
  };

  const handleMarkAllRead = () => {
    markActivitiesRead();
    markAllSystemRead();
    setUnread(0);
    setActivities(prev => prev.map(a => ({ ...a, read: true })));
  };

  const totalUnread = unread + SYSTEM_NOTIFICATIONS.filter(n => !readIds.has(n.id) && !n.read).length;

  return (
    <>
      {/* Context provider so children can open/close */}
      <NotificationPanelProvider value={{ openPanel: open, closePanel: close }} />

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
      />

      {/* Slide-in Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 z-[70] h-full w-full sm:w-[420px] bg-[#0a0a0f] border-l border-[#1e1e28] shadow-2xl shadow-black/70 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e28] flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">Notifications</h2>
            {totalUnread > 0 && (
              <span className="bg-[#d4a853] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-[#d4a853] hover:text-[#b8922e] transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" strokeWidth={1.5} /> Mark all read
              </button>
            )}
            <button
              onClick={close}
              className="p-1.5 text-[#6b7280] hover:text-white hover:bg-[#111118] rounded-lg transition-colors"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex border-b border-[#1e1e28] flex-shrink-0">
          <button
            onClick={() => setTab('activity')}
            className={`flex-1 py-3 text-xs font-semibold transition-colors ${
              tab === 'activity' ? 'text-[#d4a853] border-b-2 border-[#d4a853]' : 'text-[#6b7280] hover:text-[#9ca3af]'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setTab('all')}
            className={`flex-1 py-3 text-xs font-semibold transition-colors ${
              tab === 'all' ? 'text-[#d4a853] border-b-2 border-[#d4a853]' : 'text-[#6b7280] hover:text-[#9ca3af]'
            }`}
          >
            All Notifications
          </button>
        </div>

        {/* ─── Content ─── */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'activity' ? (
            /* ─── Activity Feed ─── */
            activities.length > 0 ? (
              <div>
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`flex items-start gap-3 px-5 py-3.5 border-b border-[#1e1e28]/30 transition-colors hover:bg-[#050507]/50 ${
                      !activity.read ? 'bg-[#d4a853]/5' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden flex-shrink-0">
                      {activity.actorAvatar ? (
                        <img src={activity.actorAvatar} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        activity.actorName[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#9ca3af] leading-relaxed">
                        <span className="text-white font-medium">{activity.actorName}</span>{' '}
                        {ACTIVITY_VERBS[activity.type]}{' '}
                        <Link href={`/community/${activity.communityId}`} onClick={close} className="text-[#d4a853] hover:underline">
                          {activity.communityName}
                        </Link>
                      </p>
                      <span className="text-[10px] text-[#6b7280]">{timeAgo(activity.createdAt)}</span>
                    </div>
                    {!activity.read && <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853] mt-2 flex-shrink-0" />}
                  </div>
                ))}
                <div className="px-5 py-4 text-center border-t border-[#1e1e28]/30">
                  <Link
                    href="/communities"
                    onClick={close}
                    className="text-xs text-[#d4a853] hover:underline"
                  >
                    View all communities
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <Bell className="w-10 h-10 text-[#2a2a35] mb-3" strokeWidth={1.5} />
                <p className="text-sm text-[#6b7280] mb-1">No activity yet</p>
                <p className="text-xs text-[#4a4a55]">Join communities to see activity here</p>
              </div>
            )
          ) : (
            /* ─── All Notifications (system + activity) ─── */
            <div>
              {/* System notifications */}
              {SYSTEM_NOTIFICATIONS.map((notif) => {
                const isRead = readIds.has(notif.id) || notif.read;
                return (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`px-5 py-3.5 border-b border-[#1e1e28]/30 flex items-start gap-3 cursor-pointer transition-colors hover:bg-[#050507]/50 ${
                      !isRead ? 'bg-[#d4a853]/5' : ''
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#111118] flex items-center justify-center flex-shrink-0">
                      <notif.icon className={`w-4 h-4 ${notif.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-white">{notif.title}</p>
                        {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853] flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-[#9ca3af] leading-relaxed">{notif.message}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-[#6b7280]">{notif.time}</span>
                        {notif.link && (
                          <Link href={notif.link} onClick={close} className="text-[10px] text-[#d4a853] hover:underline">
                            View
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Activity items mixed in */}
              {activities.length > 0 && (
                <>
                  <div className="px-5 py-2 bg-[#050507]">
                    <p className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider">Community Activity</p>
                  </div>
                  {activities.slice(0, 8).map((activity) => (
                    <div
                      key={activity.id}
                      className={`flex items-start gap-3 px-5 py-3 border-b border-[#1e1e28]/30 transition-colors hover:bg-[#050507]/50 ${
                        !activity.read ? 'bg-[#d4a853]/5' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden flex-shrink-0">
                        {activity.actorAvatar ? (
                          <img src={activity.actorAvatar} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          activity.actorName[0]?.toUpperCase() || '?'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#9ca3af] leading-relaxed">
                          <span className="text-white font-medium">{activity.actorName}</span>{' '}
                          {ACTIVITY_VERBS[activity.type]}{' '}
                          <Link href={`/community/${activity.communityId}`} onClick={close} className="text-[#d4a853] hover:underline">
                            {activity.communityName}
                          </Link>
                        </p>
                        <span className="text-[10px] text-[#6b7280]">{timeAgo(activity.createdAt)}</span>
                      </div>
                      {!activity.read && <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853] mt-2 flex-shrink-0" />}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1e1e28] flex-shrink-0">
          <Link
            href="/dashboard/settings/notifications"
            onClick={close}
            className="text-xs text-[#d4a853] hover:underline flex items-center gap-1"
          >
            <Settings className="w-3 h-3" strokeWidth={1.5} /> Preferences
          </Link>
          <Link
            href="/communities"
            onClick={close}
            className="text-xs text-[#6b7280] hover:text-[#9ca3af] transition-colors"
          >
            All Communities
          </Link>
        </div>
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────
   Helper: open panel from anywhere
   ────────────────────────────────────────────── */
export function openNotificationPanel() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('open-notification-panel'));
  }
}
