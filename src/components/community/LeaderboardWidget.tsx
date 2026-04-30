'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy, Medal, TrendingUp, TrendingDown, Minus,
  Users, MessageSquare, Flame, Star, BarChart3,
  Activity, Crown,
} from 'lucide-react';
import {
  getCommunityLeaderboard,
  getCommunityStats,
  type LeaderboardEntry,
  type CommunityStats,
} from '@/lib/community-storage';

interface LeaderboardWidgetProps {
  communityId: string;
  communityName: string;
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Platinum: { bg: 'from-purple-500/15 to-purple-500/5', text: 'text-purple-400', border: 'border-purple-500/30' },
  Gold: { bg: 'from-[#d4a853]/15 to-[#d4a853]/5', text: 'text-[#d4a853]', border: 'border-[#d4a853]/30' },
  Silver: { bg: 'from-gray-400/15 to-gray-400/5', text: 'text-gray-300', border: 'border-gray-400/30' },
  Bronze: { bg: 'from-orange-400/15 to-orange-400/5', text: 'text-orange-400', border: 'border-orange-400/30' },
  Newcomer: { bg: 'from-[#1e1e28] to-[#0c0c10]', text: 'text-[#6b7280]', border: 'border-[#1e1e28]' },
};

// SVG Medal components for top 3 ranks
function GoldMedal({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#d4a853" stroke="#b8922e" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6.5" fill="#f5c518" stroke="#d4a853" strokeWidth="0.5" />
      <path d="M12 7L13.5 10.5L17 11L14.5 13.5L15.25 17L12 15.25L8.75 17L9.5 13.5L7 11L10.5 10.5L12 7Z" fill="#fff8dc" />
    </svg>
  );
}

function SilverMedal({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#9ca3af" stroke="#6b7280" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6.5" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" />
      <path d="M12 7L13.5 10.5L17 11L14.5 13.5L15.25 17L12 15.25L8.75 17L9.5 13.5L7 11L10.5 10.5L12 7Z" fill="#f3f4f6" />
    </svg>
  );
}

function BronzeMedal({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#cd7f32" stroke="#a0522d" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6.5" fill="#da8a43" stroke="#cd7f32" strokeWidth="0.5" />
      <path d="M12 7L13.5 10.5L17 11L14.5 13.5L15.25 17L12 15.25L8.75 17L9.5 13.5L7 11L10.5 10.5L12 7Z" fill="#fde68a" />
    </svg>
  );
}

const RANK_MEDALS = [GoldMedal, SilverMedal, BronzeMedal];

export default function LeaderboardWidget({ communityId, communityName }: LeaderboardWidgetProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [activeView, setActiveView] = useState<'leaderboard' | 'stats'>('leaderboard');

  useEffect(() => {
    setLeaderboard(getCommunityLeaderboard(communityId));
    setStats(getCommunityStats(communityId));
  }, [communityId]);

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-1 bg-[#0c0c10] border border-[#1e1e28] rounded-lg overflow-hidden">
        <button
          onClick={() => setActiveView('leaderboard')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
            activeView === 'leaderboard' ? 'bg-[#d4a853] text-white' : 'text-[#6b7280] hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4" /> Leaderboard
        </button>
        <button
          onClick={() => setActiveView('stats')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
            activeView === 'stats' ? 'bg-[#d4a853] text-white' : 'text-[#6b7280] hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Stats
        </button>
      </div>

      {/* Leaderboard view */}
      {activeView === 'leaderboard' && (
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-[#1e1e28]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#d4a853]/10 border border-[#d4a853]/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-[#d4a853]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Top Contributors</h3>
                <p className="text-xs text-[#6b7280]">Most active members in {communityName}</p>
              </div>
            </div>
          </div>

          {/* Top 3 podium */}
          {leaderboard.length >= 3 && (
            <div className="p-5 bg-gradient-to-b from-[#d4a853]/5 to-transparent">
              <div className="grid grid-cols-3 gap-3">
                {/* 2nd place */}
                <div className="text-center pt-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold overflow-hidden border-2 border-gray-400/30">
                    {leaderboard[1].avatar ? (
                      <img src={leaderboard[1].avatar} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : leaderboard[1].userName[0]}
                  </div>
                  <SilverMedal className="w-6 h-6" />
                  <p className="text-xs font-semibold text-white mt-1 truncate">{leaderboard[1].userName}</p>
                  <p className="text-[10px] text-[#6b7280]">{leaderboard[1].totalScore} pts</p>
                </div>
                {/* 1st place */}
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] mx-auto mb-2 flex items-center justify-center text-white text-base font-bold overflow-hidden border-2 border-[#d4a853]/50 shadow-lg shadow-[#d4a853]/20">
                    {leaderboard[0].avatar ? (
                      <img src={leaderboard[0].avatar} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : leaderboard[0].userName[0]}
                  </div>
                  <GoldMedal className="w-8 h-8" />
                  <p className="text-sm font-bold text-[#d4a853] mt-1 truncate">{leaderboard[0].userName}</p>
                  <p className="text-[10px] text-[#d4a853]">{leaderboard[0].totalScore} pts</p>
                  <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full border mt-1 ${TIER_STYLES[leaderboard[0].tier].border} ${TIER_STYLES[leaderboard[0].tier].text} bg-gradient-to-r ${TIER_STYLES[leaderboard[0].tier].bg}`}>
                    {leaderboard[0].tier}
                  </span>
                </div>
                {/* 3rd place */}
                <div className="text-center pt-8">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 mx-auto mb-2 flex items-center justify-center text-white text-xs font-bold overflow-hidden border-2 border-orange-400/30">
                    {leaderboard[2].avatar ? (
                      <img src={leaderboard[2].avatar} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : leaderboard[2].userName[0]}
                  </div>
                  <BronzeMedal className="w-6 h-6" />
                  <p className="text-xs font-semibold text-white mt-1 truncate">{leaderboard[2].userName}</p>
                  <p className="text-[10px] text-[#6b7280]">{leaderboard[2].totalScore} pts</p>
                </div>
              </div>
            </div>
          )}

          {/* Full leaderboard list */}
          <div className="divide-y divide-[#1e1e28]/50">
            {leaderboard.map((entry) => {
              const style = TIER_STYLES[entry.tier] || TIER_STYLES.Newcomer;
              return (
                <div key={entry.userId} className="flex items-center gap-3 p-4 hover:bg-[#050507]/50 transition-colors">
                  {/* Rank */}
                  <div className="w-7 text-center flex-shrink-0">
                    {entry.rank <= 3 ? (
                      (() => {
                        const MedalComponent = RANK_MEDALS[entry.rank - 1];
                        return <MedalComponent className="w-5 h-5" />;
                      })()
                    ) : (
                      <span className="text-xs font-bold text-[#6b7280]">#{entry.rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8922e] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden flex-shrink-0">
                    {entry.avatar ? (
                      <img src={entry.avatar} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : entry.userName[0]?.toUpperCase() || '?'}
                  </div>

                  {/* Name & stats */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/profile/${entry.userId}`} className="text-sm font-semibold text-white hover:text-[#d4a853] transition-colors truncate">
                        {entry.userName}
                      </Link>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${style.border} ${style.text} bg-gradient-to-r ${style.bg}`}>
                        {entry.tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[#6b7280] mt-0.5">
                      <span className="flex items-center gap-1"><MessageSquare className="w-2.5 h-2.5" /> {entry.postsCount}</span>
                      <span className="flex items-center gap-1"><Flame className="w-2.5 h-2.5 text-orange-400" /> {entry.streak}d</span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-white">{entry.totalScore}</p>
                    <p className="text-[9px] text-[#6b7280]">points</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats view */}
      {activeView === 'stats' && stats && (
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-[#1e1e28]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Community Stats</h3>
                <p className="text-xs text-[#6b7280]">Health and activity overview</p>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-[#050507] border border-[#1e1e28] rounded-lg p-4 text-center">
                <Users className="w-5 h-5 text-[#d4a853] mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{stats.totalMembers.toLocaleString()}</p>
                <p className="text-[10px] text-[#6b7280]">Total Members</p>
              </div>
              <div className="bg-[#050507] border border-[#1e1e28] rounded-lg p-4 text-center">
                <Activity className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{stats.activeThisWeek.toLocaleString()}</p>
                <p className="text-[10px] text-[#6b7280]">Active This Week</p>
              </div>
              <div className="bg-[#050507] border border-[#1e1e28] rounded-lg p-4 text-center">
                <MessageSquare className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{stats.totalPosts.toLocaleString()}</p>
                <p className="text-[10px] text-[#6b7280]">Total Posts</p>
              </div>
              <div className="bg-[#050507] border border-[#1e1e28] rounded-lg p-4 text-center">
                <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{stats.avgRating}</p>
                <p className="text-[10px] text-[#6b7280]">Avg Rating</p>
              </div>
            </div>

            {/* Growth indicator */}
            <div className="bg-[#050507] border border-[#1e1e28] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Community Health</span>
                <div className="flex items-center gap-1">
                  {stats.weeklyTrend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : stats.weeklyTrend === 'down' ? (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  ) : (
                    <Minus className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className={`text-xs font-semibold ${
                    stats.weeklyTrend === 'up' ? 'text-green-400' : stats.weeklyTrend === 'down' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {stats.weeklyTrend === 'up' ? '+' : ''}{stats.growthRate}% growth
                  </span>
                </div>
              </div>

              {/* Activity bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-[10px] text-[#6b7280] mb-1">
                  <span>Weekly Activity</span>
                  <span>{Math.round((stats.activeThisWeek / stats.totalMembers) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-[#1e1e28] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      stats.weeklyTrend === 'up' ? 'bg-green-400' : stats.weeklyTrend === 'down' ? 'bg-red-400' : 'bg-yellow-400'
                    }`}
                    style={{ width: `${Math.min(100, (stats.activeThisWeek / stats.totalMembers) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Top genre */}
              <div className="flex items-center gap-2 mt-3">
                <Crown className="w-3.5 h-3.5 text-[#d4a853]" />
                <span className="text-xs text-[#9ca3af]">Top Genre: </span>
                <span className="text-xs font-semibold text-[#d4a853]">{stats.topGenre}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
