'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Check, X } from 'lucide-react';
import {
  getMyActivityFeed,
  getUnreadCount,
  markActivitiesRead,
  getJoinedCommunities,
  timeAgo,
  type ActivityItem,
  type ActivityType,
} from '@/lib/community-storage';

const ACTIVITY_VERBS: Record<ActivityType, string> = {
  'new_post': 'posted in',
  'new_comment': 'commented in',
  'new_debate': 'started a debate in',
  'new_member': 'joined',
  'weekly_theme': 'new theme in',
  'watchlist_vote': 'voted in',
  'like': 'liked a post in',
};

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUnread(getUnreadCount());
    // Poll for new notifications every 30s
    const interval = setInterval(() => {
      setUnread(getUnreadCount());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const joined = getJoinedCommunities();
      setActivities(getMyActivityFeed(joined, 10));
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    markActivitiesRead();
    setUnread(0);
    setActivities(prev => prev.map(a => ({ ...a, read: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-[#9ca3af] hover:text-white hover:bg-[#111118] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0c0c10] border border-[#1e1e28] rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#1e1e28]">
            <h3 className="text-sm font-bold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-[#d4a853] hover:text-[#b8922e] transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="text-[#6b7280] hover:text-white p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Activity list */}
          <div className="max-h-96 overflow-y-auto">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-start gap-3 p-3 border-b border-[#1e1e28]/30 transition-colors hover:bg-[#050507]/50 ${!activity.read ? 'bg-[#d4a853]/5' : ''}`}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-[9px] font-bold overflow-hidden flex-shrink-0">
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
                      <Link href={`/community/${activity.communityId}`} className="text-[#d4a853] hover:underline" onClick={() => setIsOpen(false)}>
                        {activity.communityName}
                      </Link>
                    </p>
                    <span className="text-[10px] text-[#6b7280]">{timeAgo(activity.createdAt)}</span>
                  </div>
                  {!activity.read && <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853] mt-2 flex-shrink-0" />}
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-[#2a2a35] mx-auto mb-2" />
                <p className="text-xs text-[#6b7280]">No notifications yet</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[#1e1e28] text-center">
            <Link
              href="/communities"
              onClick={() => setIsOpen(false)}
              className="text-xs text-[#d4a853] hover:underline"
            >
              View all communities
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
