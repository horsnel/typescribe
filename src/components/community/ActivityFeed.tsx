'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell, MessageSquare, Swords, UserPlus, BookmarkPlus,
  Heart, Sparkles, Check, X, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getMyActivityFeed,
  getUnreadCount,
  markActivitiesRead,
  type ActivityItem,
  type ActivityType,
} from '@/lib/community-storage';
import { timeAgo } from '@/lib/community-storage';

interface ActivityFeedProps {
  joinedCommunityIds: string[];
  communityId?: string; // If provided, only show this community's activity
  maxItems?: number;
  showHeader?: boolean;
}

const ACTIVITY_ICONS: Record<ActivityType, { icon: typeof MessageSquare; color: string; bgColor: string }> = {
  'new_post': { icon: MessageSquare, color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  'new_comment': { icon: MessageSquare, color: 'text-[#D4A853]', bgColor: 'bg-[#D4A853]/10 border-[#D4A853]/20' },
  'new_debate': { icon: Swords, color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20' },
  'new_member': { icon: UserPlus, color: 'text-[#D4A853]', bgColor: 'bg-[#D4A853]/10 border-[#D4A853]/20' },
  'weekly_theme': { icon: Sparkles, color: 'text-[#D4A853]', bgColor: 'bg-[#D4A853]/10 border-[#D4A853]/20' },
  'watchlist_vote': { icon: BookmarkPlus, color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20' },
  'like': { icon: Heart, color: 'text-pink-400', bgColor: 'bg-pink-500/10 border-pink-500/20' },
};

const ACTIVITY_VERBS: Record<ActivityType, string> = {
  'new_post': 'posted',
  'new_comment': 'commented on',
  'new_debate': 'started a debate in',
  'new_member': 'joined',
  'weekly_theme': 'set a new theme for',
  'watchlist_vote': 'voted for a movie in',
  'like': 'liked a post in',
};

export default function ActivityFeed({ joinedCommunityIds, communityId, maxItems = 15, showHeader = true }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const feed = communityId
      ? getMyActivityFeed([communityId], maxItems)
      : getMyActivityFeed(joinedCommunityIds, maxItems);
    setActivities(feed);
    setUnread(getUnreadCount());
  }, [joinedCommunityIds, communityId, maxItems]);

  const handleMarkRead = () => {
    markActivitiesRead(communityId);
    setUnread(0);
    setActivities(prev => prev.map(a => ({ ...a, read: true })));
  };

  const displayed = showAll ? activities : activities.slice(0, 5);

  if (activities.length === 0) {
    return (
      <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-5 text-center">
        <Bell className="w-10 h-10 text-[#2a2a35] mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm text-[#9ca3af]">No activity yet</p>
        <p className="text-xs text-[#6b7280]">Activity from your communities will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
      {showHeader && (
        <div className="p-5 border-b border-[#1e1e28]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D4A853]/10 border border-[#D4A853]/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-[#D4A853]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Activity Feed</h3>
                <p className="text-xs text-[#6b7280]">What&apos;s happening in your communities</p>
              </div>
            </div>
            {unread > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-[#D4A853]/20 text-[#D4A853] px-2 py-0.5 rounded-full font-semibold">{unread} new</span>
                <Button onClick={handleMarkRead} variant="ghost" size="sm" className="text-xs text-[#6b7280] hover:text-white gap-1 min-h-[32px]">
                  <Check className="w-3 h-3" strokeWidth={1.5} /> Mark read
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="divide-y divide-[#1e1e28]/50">
        {displayed.map((activity) => {
          const config = ACTIVITY_ICONS[activity.type];
          const Icon = config.icon;
          const verb = ACTIVITY_VERBS[activity.type];

          return (
            <div
              key={activity.id}
              className={`flex items-start gap-3 p-4 transition-colors hover:bg-[#050507]/50 ${!activity.read ? 'bg-[#D4A853]/5' : ''}`}
            >
              {/* Actor avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4A853] to-[#B8922F] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden flex-shrink-0">
                {activity.actorAvatar ? (
                  <img src={activity.actorAvatar} alt={activity.actorName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  activity.actorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#9ca3af] leading-relaxed">
                  <span className="text-white font-medium">{activity.actorName}</span>{' '}
                  {verb}{' '}
                  <Link href={`/community/${activity.communityId}`} className="text-[#D4A853] hover:underline">{activity.communityName}</Link>
                  {activity.targetTitle && activity.type !== 'new_member' && (
                    <>
                      {' — '}
                      <span className="text-white/80 font-medium">&ldquo;{activity.targetTitle}&rdquo;</span>
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[#6b7280] flex items-center gap-1">
                    <Clock className="w-3 h-3" strokeWidth={1.5} /> {timeAgo(activity.createdAt)}
                  </span>
                  {!activity.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E8C97A]" />
                  )}
                </div>
              </div>

              {/* Type icon */}
              <div className={`w-7 h-7 rounded-lg ${config.bgColor} border flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more / less */}
      {activities.length > 5 && (
        <div className="p-3 border-t border-[#1e1e28]/50 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-[#6b7280] hover:text-[#D4A853] gap-1 min-h-[36px]"
          >
            {showAll ? 'Show Less' : `Show All (${activities.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}
