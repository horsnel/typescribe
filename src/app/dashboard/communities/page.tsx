'use client';

import { useEffect, useState } from 'react';
import DashboardSidebar from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Users, Plus, Globe, Sparkles, Film, ExternalLink, LogOut, Trophy, Video, Star } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import AchievementBadge from '@/components/community/AchievementBadge';
import LeaderboardWidget from '@/components/community/LeaderboardWidget';
import {
  getJoinedCommunities as getJoinedCommunityIds,
  saveJoinedCommunities as saveJoinedCommunityIds,
  getUpcomingMovieClubs,
  type MovieClub,
} from '@/lib/community-storage';

const ALL_COMMUNITIES = [
  { id: 'horror-fans', name: 'Horror Fans', members: 1240, description: 'For lovers of horror and thriller films', type: 'Genre' },
  { id: 'k-drama-club', name: 'K-Drama Club', members: 3420, description: 'Korean drama discussions and recommendations', type: 'Country' },
  { id: 'nollywood-watchers', name: 'Nollywood Watchers', members: 890, description: 'Celebrating Nigerian cinema and Nollywood', type: 'Country' },
  { id: 'nolan-fans', name: 'Christopher Nolan Fans', members: 2100, description: 'Everything about Nolan films and filmmaking', type: 'Creator' },
  { id: 'anime-explorers', name: 'Anime Explorers', members: 5600, description: 'Anime recommendations, reviews, and discussions', type: 'Theme' },
  { id: 'classic-cinema', name: 'Classic Cinema', members: 780, description: 'Pre-1970s cinema appreciation and discussion', type: 'Theme' },
  { id: 'sci-fi-nerds', name: 'Sci-Fi Nerds', members: 3200, description: 'Exploring the final frontier of cinema', type: 'Genre' },
  { id: 'indie-films', name: 'Indie Film Lovers', members: 1560, description: 'Independent and art-house cinema discussions', type: 'Theme' },
];

export default function DashboardCommunitiesPage() {
  const { user, isAuthenticated } = useAuth();
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'joined' | 'discover' | 'achievements' | 'leaderboard'>('joined');
  const [upcomingClubs, setUpcomingClubs] = useState<MovieClub[]>([]);

  useEffect(() => {
    const ids = getJoinedCommunityIds();
    setJoinedIds(ids);
    setUpcomingClubs(getUpcomingMovieClubs(ids));
  }, []);

  const toggleJoin = (id: string) => {
    const updated = joinedIds.includes(id)
      ? joinedIds.filter(j => j !== id)
      : [...joinedIds, id];
    setJoinedIds(updated);
    saveJoinedCommunityIds(updated);
  };

  const joinedCommunities = ALL_COMMUNITIES.filter(c => joinedIds.includes(c.id));

  if (!isAuthenticated) {
    return <DashboardSidebar><div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center"><p className="text-[#9ca3af]">Please sign in to view your communities.</p><Link href="/login" className="text-[#d4a853] hover:underline text-sm">Sign In</Link></div></DashboardSidebar>;
  }

  return (
    <DashboardSidebar>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">My Communities</h1>
        <Link href="/communities"><Button className="bg-[#d4a853] hover:bg-[#b8922e] text-white gap-2 min-h-[44px]"><Plus className="w-4 h-4" strokeWidth={1.5} />Discover Communities</Button></Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{joinedIds.length}</p>
          <p className="text-xs text-[#6b7280]">Communities</p>
        </div>
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{joinedCommunities.reduce((sum, c) => sum + c.members, 0).toLocaleString()}</p>
          <p className="text-xs text-[#6b7280]">Total Members</p>
        </div>
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{upcomingClubs.length}</p>
          <p className="text-xs text-[#6b7280]">Upcoming Clubs</p>
        </div>
        <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#d4a853]">{joinedIds.length > 0 ? 'Active' : 'New'}</p>
          <p className="text-xs text-[#6b7280]">Status</p>
        </div>
      </div>

      {/* Upcoming Movie Clubs */}
      {upcomingClubs.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Video className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Upcoming Watch Parties</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingClubs.slice(0, 4).map((club) => (
              <Link
                key={club.id}
                href={`/community/${club.communityId}`}
                className="bg-[#0c0c10] border border-blue-500/20 rounded-xl p-4 hover:border-blue-500/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Film className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">{club.movieTitle}</h4>
                    <p className="text-[10px] text-[#6b7280]">{new Date(club.scheduledDate).toLocaleDateString()} · {club.attendees.length} attending</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#1e1e28] overflow-x-auto">
        {(['joined', 'achievements', 'leaderboard', 'discover'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 min-h-[44px] whitespace-nowrap ${activeTab === tab ? 'text-white border-[#d4a853]' : 'text-[#6b7280] border-transparent hover:text-white'}`}
          >
            {tab === 'joined' ? `Joined (${joinedIds.length})` : tab === 'achievements' ? 'Badges' : tab === 'leaderboard' ? 'Leaderboard' : 'Discover'}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'joined' && (
        joinedCommunities.length === 0 ? (
          <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center">
            <Users className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No communities joined yet</h2>
            <p className="text-[#9ca3af] mb-6">Join communities to discuss movies with like-minded fans.</p>
            <button onClick={() => setActiveTab('discover')} className="text-[#d4a853] hover:underline text-sm">Discover Communities</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {joinedCommunities.map((community) => (
              <div key={community.id} className="bg-[#0c0c10] border border-[#d4a853]/30 rounded-xl p-5 hover:border-[#d4a853]/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link href={`/community/${community.id}`} className="text-base font-semibold text-white hover:text-[#d4a853] transition-colors">
                      {community.name}
                    </Link>
                    <span className="text-xs text-[#d4a853] bg-[#d4a853]/10 px-2 py-0.5 rounded-full ml-2">{community.type}</span>
                  </div>
                  <Button size="sm" onClick={() => toggleJoin(community.id)} variant="outline" className="border-[#d4a853]/30 text-[#d4a853] hover:bg-[#d4a853]/10 text-xs gap-1 min-h-[44px]">
                    <LogOut className="w-3 h-3" />Leave
                  </Button>
                </div>
                <p className="text-sm text-[#9ca3af] mb-3">{community.description}</p>
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <Users className="w-3.5 h-3.5" strokeWidth={1.5} /> {community.members.toLocaleString()} members
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'achievements' && user && (
        <div>
          {joinedIds.length > 0 ? (
            <div className="space-y-6">
              {joinedIds.slice(0, 3).map((communityId) => (
                <AchievementBadge key={communityId} userId={user.id} communityId={communityId} />
              ))}
            </div>
          ) : (
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center">
              <Trophy className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">No Badges Yet</h2>
              <p className="text-[#9ca3af]">Join communities and start contributing to earn achievements!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div>
          {joinedIds.length > 0 ? (
            <LeaderboardWidget communityId={joinedIds[0]} communityName={ALL_COMMUNITIES.find(c => c.id === joinedIds[0])?.name || ''} />
          ) : (
            <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl p-12 text-center">
              <Star className="w-12 h-12 text-[#2a2a35] mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Join a Community First</h2>
              <p className="text-[#9ca3af]">Leaderboards appear once you join communities.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'discover' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ALL_COMMUNITIES.map((community) => {
            const isJoined = joinedIds.includes(community.id);
            return (
              <div key={community.id} className={`bg-[#0c0c10] border rounded-xl p-5 hover:border-[#3a3a45] transition-colors ${isJoined ? 'border-[#d4a853]/30' : 'border-[#1e1e28]'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link href={`/community/${community.id}`} className="text-base font-semibold text-white hover:text-[#d4a853] transition-colors">
                      {community.name}
                    </Link>
                    <span className="text-xs text-[#d4a853] bg-[#d4a853]/10 px-2 py-0.5 rounded-full ml-2">{community.type}</span>
                  </div>
                  <Button size="sm" onClick={() => toggleJoin(community.id)} variant={isJoined ? 'outline' : 'default'} className={isJoined ? 'border-[#d4a853]/30 text-[#d4a853] hover:bg-[#d4a853]/10 text-xs min-h-[44px]' : 'bg-[#d4a853] hover:bg-[#b8922e] text-white text-xs min-h-[44px]'}>
                    {isJoined ? 'Joined' : 'Join'}
                  </Button>
                </div>
                <p className="text-sm text-[#9ca3af] mb-3">{community.description}</p>
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <Users className="w-3.5 h-3.5" strokeWidth={1.5} /> {community.members.toLocaleString()} members
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardSidebar>
  );
}
